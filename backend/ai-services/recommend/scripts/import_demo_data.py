"""GTEC 합성 데이터의 PostgreSQL 적재 (사전 점검 기본, 명시적 적용만).

미리보기: python -m scripts.import_demo_data initial
실제 반영: python -m scripts.import_demo_data initial --apply --confirm-db gtec
증분 반영: python -m scripts.import_demo_data append_001 --apply --confirm-db gtec

중요: 기존 DB 먼저 백업. DB와 엔티티 스키마가 일치할 때만 실행.
한 트랜잭션에서 모든 PK/FK를 매핑하고, 실패 시 롤백합니다.
기존 회원과 주문은 수정하거나 삭제하지 않습니다.
--sync-existing-thumbnails를 지정하면 카탈로그와 일치하는 상품의 대표 이미지를 동기화합니다.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import re
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path
from sqlalchemy import MetaData, Table, select, insert, update, text, inspect
from app.core.database import engine
from scripts.generate_demo_data import DATA, MI, OI, RI, payment_from_order, read_catalog

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'generated_demo'
TABLES=['members','products','images','orders','payments','order_items','deliveries',
        'reviews','return_requests','notices','faqs']
DB_TABLE = {'images': 'product_images'}
LEGACY_ORDER_FIELDS = {'shipping_name', 'shipping_phone', 'shipping_zipcode',
                       'shipping_address1', 'shipping_address2', 'payment_key'}
ENUM_VALUES = {
    'members': {'role': {'USER'}, 'status': {'ACTIVE'}},
    'products': {'status': {'ACTIVE'}},
    'orders': {'status': {'PENDING', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED',
                          'COMPLETED', 'CANCELLED', 'REFUNDED'},
               'payment_method': {'CREDIT_CARD', 'BANK_TRANSFER', 'VIRTUAL_ACCOUNT', 'KAKAO_PAY', 'NAVER_PAY', 'TOSS'}},
    'deliveries': {'status': {'PREPARING', 'DELIVERING', 'COMPLETED'}},
    'payments': {'status': {'READY', 'DONE', 'CANCELED'}},
    'return_requests': {'status': {'REQUESTED', 'APPROVED', 'REJECTED', 'REFUNDED'}},
}


def schema_report():
    """실제 연결된 DB의 테이블/필수 컬럼을 읽기만 합니다 (비밀번호 출력 없음)."""
    engine.echo = False
    inspector=inspect(engine)
    current=set(inspector.get_table_names())
    print('연결 DB 종류:',engine.dialect.name)
    for label in TABLES:
        name = DB_TABLE.get(label, label)
        if name not in current:
            print(f'[MISSING] {name}')
            continue
        columns=inspector.get_columns(name)
        mandatory=[c['name'] for c in columns
                   if not c.get('nullable',True) and c.get('default') is None
                   and c['name']!='id']
        print(f'[FOUND] {name}: 전체 {len(columns)}개 컬럼 / 필수: {mandatory}')
    if 'payments' in current:
        print('[확인] payments 테이블 존재. 시연 결제에는 실제 Toss payment_key를 저장하지 않습니다.')
    print('이 출력은 구조 요약일 뿐 실제 INSERT 검증은 아닙니다.')



def load(folder):
    data={}
    for table in TABLES:
        path=folder/f'{table}.csv'
        if path.exists():
            with path.open(encoding='utf-8-sig',newline='') as f:
                data[table]=list(csv.DictReader(f))
        else:data[table]=[]
    if not data['members'] or not data['orders'] or not data['order_items'] or not data['reviews']:
        raise ValueError('회원/주문/주문상품/리뷰 파일이 누락되었습니다.')
    # 2026-11-20 이전에 생성된 initial/append CSV에는 orders의 필수 배송지
    # 4개 항목이 없을 수 있습니다. 재생성 없이 동일 주문의 deliveries에서 복원합니다.
    # 취소 주문은 delivery가 없으므로 시연 회원 정보와 가상 배송지로 채웁니다.
    delivery_by_order={d['order_id']: d for d in data['deliveries']}
    member_by_id={m['id']: m for m in data['members']}
    repaired=0
    for order in data['orders']:
        delivery=delivery_by_order.get(order['id'], {})
        member=member_by_id.get(order['member_id'], {})
        mid=order['member_id']
        defaults={
            'shipping_name': delivery.get('shipping_name') or member.get('name') or f'시연회원{mid}',
            'shipping_phone': delivery.get('shipping_phone') or member.get('tel') or '01000000000',
            'shipping_zipcode': delivery.get('shipping_zipcode') or '00000',
            'shipping_address1': delivery.get('shipping_address1') or '서울특별시 가상구 테스트로 10',
        }
        for field,value in defaults.items():
            if not order.get(field):
                order[field]=value
                repaired+=1
        if not order.get('shipping_address2'):
            order['shipping_address2']=delivery.get('shipping_address2') or '시연용'
    if repaired:
        print(f'[CSV 호환 보완] 과거 주문 CSV의 필수 배송지 필드 {repaired}개를 보완했습니다. 원본 CSV는 수정하지 않습니다.')
    # 이전에 만들어둔 initial/append에는 payments.csv가 없습니다.
    # 기존 orders.csv에서 결제 레코드를 메모리로 복원합니다 (CSV/상태 파일 수정 없음).
    expected=[p for order in data['orders'] if (p:=payment_from_order(order)) is not None]
    if data['payments']:
        # 수정된 생성기가 만든 CSV라도 주문/결제 관계와 가상 키 안전성을 검증합니다.
        actual_by_order={str(p['order_id']):p for p in data['payments']}
        if len(actual_by_order)!=len(data['payments']) or len(expected)!=len(data['payments']):
            raise ValueError('payments.csv 주문 ID 중복 또는 결제 누락')
        for payment in expected:
            actual=actual_by_order.get(str(payment['order_id']))
            if actual is None or actual != payment:
                raise ValueError(f"payments.csv가 주문 상태/금액과 다릅니다: 주문 {payment['order_id']}")
    else:
        data['payments']=expected
        print(f'[CSV 호환 보완] 기존 주문에서 가상 payments {len(expected)}건을 메모리에서 생성했습니다. 원본 CSV는 수정하지 않습니다.')
    return data


def typed(value, column):
    if value is None or value=='':return None
    from sqlalchemy import Boolean, Date, DateTime, Integer, Numeric, Float
    t=column.type
    if isinstance(t, Boolean):
        token = str(value).lower()
        if token in {'true', '1', 'yes'}:
            return True
        if token in {'false', '0', 'no'}:
            return False
        raise ValueError('잘못된 Boolean 값입니다.')
    if isinstance(t,DateTime):return datetime.fromisoformat(value) if isinstance(value,str) else value
    if isinstance(t,Date):return date.fromisoformat(value) if isinstance(value,str) else value
    if isinstance(t,Integer):return int(value)
    if isinstance(t, Float): return float(value)
    if isinstance(t, Numeric): return Decimal(value)
    return value


def payload(t,row,*,ignore=('id',)):
    # 예전 CSV에는 rating이 있지만, 최신 reviews 테이블에서는 rating을 삭제했습니다.
    # 오직 reviews.rating만 예외 처리하며 다른 컬럼 불일치는 그대로 오류로 중단합니다.
    if t.name == 'reviews' and 'rating' not in t.c and 'rating' in row:
        row = {key: value for key, value in row.items() if key != 'rating'}
    if t.name == 'orders':
        key = row.get('payment_key')
        if key and not re.fullmatch(r'DEMO-PAY-[0-9]+', key):
            raise ValueError('기존 주문 CSV에 검증되지 않은 결제 키가 있습니다.')
        row = {key: value for key, value in row.items() if key in t.c or key not in LEGACY_ORDER_FIELDS}
        if 'payment_key' in row:
            row['payment_key'] = None
    bad=set(row)-set(t.c.keys())-set(ignore)
    if bad:raise ValueError(f'{t.name} 테이블 컬럼 불일치: {sorted(bad)}')
    p={}
    for k,v in row.items():
        if k in t.c and k not in ignore:
            p[k]=typed(v,t.c[k])
    return p


def preflight(tables, rows):
    """Validate each row against the reflected table, including blank required fields."""
    for logical_name, items in rows.items():
        if not items:
            continue
        table = tables[logical_name]
        required = [column.name for column in table.c
                    if column.name != 'id' and not column.nullable
                    and column.default is None and column.server_default is None]
        for index, row in enumerate(items, start=2):
            try:
                record = payload(table, row)
                missing = [field for field in required if record.get(field) is None]
                if missing:
                    raise ValueError(f'필수 값 누락: {missing}')
                for field, allowed in ENUM_VALUES.get(logical_name, {}).items():
                    if record.get(field) not in allowed:
                        raise ValueError(f'{field} 상태 또는 분류가 허용되지 않습니다.')
                for field, value in record.items():
                    limit = getattr(table.c[field].type, 'length', None)
                    if isinstance(value, str) and limit and len(value) > limit:
                        raise ValueError(f'{field} 최대 길이 초과 ({limit})')
            except (ValueError, TypeError, ArithmeticError) as error:
                raise ValueError(f'{logical_name}.csv {index}행: {error}') from error


def indexed(rows, key, label):
    values = {}
    for row in rows:
        index = int(row[key])
        if index <= 0 or index in values:
            raise ValueError(f'{label} ID가 양수가 아니거나 중복되었습니다: {index}')
        values[index] = row
    return values


def product_key(row):
    return row['category'].strip().upper(), row['name'].strip().casefold()


def validate_batch(rows, batch, catalog):
    orders = indexed(rows['orders'], 'id', '주문')
    items = indexed(rows['order_items'], 'id', '주문상품')
    members = indexed(rows['members'], 'id', '회원')
    for local_id, member in members.items():
        if member['login_id'] != f'demo_{local_id:06d}' or member['role'] != 'USER':
            raise ValueError(f'시연 회원 ID 또는 역할 불일치: {local_id}')
    expected_member, expected_order, expected_review = (1000, 10000, 5000) if batch == 'initial' else (MI, OI, RI)
    if (len(members), len(orders), len(rows['reviews'])) != (expected_member, expected_order, expected_review):
        raise ValueError(f'{batch} 배치의 회원·주문·리뷰 수가 목표값과 다릅니다.')
    if batch == 'initial':
        products = indexed(rows['products'], 'id', '상품')
        for product_id, entry in catalog.items():
            product = products.get(product_id)
            if product is None or product_key(product) != product_key(entry):
                raise ValueError(f'초기 상품의 ID와 카탈로그가 일치하지 않습니다: {product_id}')
        if len(products) != len(catalog) or len(rows['images']) != 228:
            raise ValueError('초기 카탈로그는 상품 120개 및 이미지 228개여야 합니다.')
        expected_links = {
            (i, url, str(index == 0), index)
            for i, entry in catalog.items()
            for index, url in enumerate(entry['image_urls'].split('|'))
        }
        actual_links = {
            (int(row['product_id']), row['image_url'], str(row['is_primary'].lower() in {'true','1'}), int(row['sort_order']))
            for row in rows['images']
        }
        if actual_links != expected_links:
            raise ValueError('초기 상품 이미지가 고정 카탈로그와 다릅니다.')
    elif any(rows[key] for key in ('products', 'images', 'notices', 'faqs', 'return_requests')):
        raise ValueError('증분 배치에 초기 전용 데이터가 포함되어 있습니다.')

    delivery = indexed(rows['deliveries'], 'order_id', '배송 주문')
    expected_deliveries = {key for key, order in orders.items() if order['status'] != 'CANCELLED'}
    if set(delivery) != expected_deliveries:
        raise ValueError('배송과 비취소 주문의 일대일 연결이 올바르지 않습니다.')
    per_order = {}
    for item in items.values():
        order_id, product_id = int(item['order_id']), int(item['product_id'])
        if order_id not in orders or product_id not in catalog:
            raise ValueError(f'주문상품의 주문 또는 상품 참조를 찾을 수 없습니다: {item["id"]}')
        quantity, price, total = (int(item[key]) for key in ('quantity', 'unit_price', 'total_price'))
        if quantity < 1 or price < 0 or total != price * quantity:
            raise ValueError(f'주문상품 금액 또는 수량이 올바르지 않습니다: {item["id"]}')
        group = per_order.setdefault(order_id, {})
        if product_id in group:
            raise ValueError(f'같은 주문에 동일 상품이 중복되었습니다: {order_id}')
        group[product_id] = total

    for order_id, order in orders.items():
        if order['order_number'] != f'DEMO-{order_id:010d}':
            raise ValueError(f'주문번호가 시연 주문 형식이 아닙니다: {order_id}')
        group = per_order.get(order_id, {})
        subtotal, shipping, discount, total = (
            int(order[key]) for key in ('sub_total', 'shipping_fee', 'discount_amount', 'total_amount'))
        if not 1 <= len(group) <= 4 or subtotal != sum(group.values()) or min(shipping, discount, total) < 0 or total != subtotal + shipping - discount:
            raise ValueError(f'주문 상품 수 또는 합계가 올바르지 않습니다: {order_id}')
        member_id = int(order['member_id'])
        if member_id <= 0 or (batch == 'initial' and member_id not in members):
            raise ValueError(f'주문의 합성 회원 참조가 올바르지 않습니다: {order_id}')
        created = datetime.fromisoformat(order['created_at'])
        if datetime.fromisoformat(order['updated_at']) < created:
            raise ValueError(f'주문 수정 시간이 생성 이전입니다: {order_id}')
        if order.get('paid_at') and datetime.fromisoformat(order['paid_at']) < created:
            raise ValueError(f'주문 결제 시간이 생성 이전입니다: {order_id}')
        if member_id in members and datetime.fromisoformat(members[member_id]['created_at']) > created:
            raise ValueError(f'회원 가입 전에 주문했습니다: {order_id}')

    indexed(rows['reviews'], 'id', '리뷰')
    for item_id, review in indexed(rows['reviews'], 'order_item_id', '리뷰 대상 주문상품').items():
        item = items.get(item_id)
        order = orders[int(item['order_id'])] if item else None
        if not order or order['status'] != 'COMPLETED' or int(order['member_id']) != int(review['member_id']) or int(item['product_id']) != int(review['product_id']):
            raise ValueError(f'리뷰의 회원 또는 구매 상품이 완료 주문과 일치하지 않습니다: {item_id}')
        if datetime.fromisoformat(review['created_at']) < datetime.fromisoformat(order['created_at']):
            raise ValueError(f'리뷰 작성 시각이 주문보다 앞섭니다: {item_id}')
    for row in rows['return_requests']:
        item = items.get(int(row['order_item_id']))
        order = orders.get(int(row['order_id']))
        if not item or not order or order['status'] != 'COMPLETED' or int(item['order_id']) != int(row['order_id']):
            raise ValueError(f'반품의 주문상품 연결이 올바르지 않습니다: {row["id"]}')
        if not 1 <= int(row['quantity']) <= int(item['quantity']):
            raise ValueError(f'반품 수량이 주문상품 수량을 초과합니다: {row["id"]}')


def order_matches(conn, table, order_numbers):
    return sum(
        len(conn.execute(select(table.c.id).where(
            table.c.order_number.in_(order_numbers[offset:offset+1500]))).all())
        for offset in range(0, len(order_numbers), 1500)
    )


def verify_previous_batches(conn, table, batch):
    if batch == 'initial':
        return
    current = int(batch.removeprefix('append_'))
    for previous in ['initial', *(f'append_{number:03d}' for number in range(1, current))]:
        path = OUTPUT / previous / 'orders.csv'
        if not path.is_file():
            raise ValueError(f'선행 배치 파일이 없습니다: {previous}')
        with path.open(encoding='utf-8-sig', newline='') as file:
            numbers = [row['order_number'] for row in csv.DictReader(file)]
        expected = 10000 if previous == 'initial' else OI
        if len(numbers) != expected or len(set(numbers)) != expected or order_matches(conn, table, numbers) != expected:
            raise ValueError(f'선행 배치를 먼저 완전히 적재하세요: {previous}')


def main(batch='initial', apply=False, confirm_db=None, sync_existing_thumbnails=False):
    if batch != 'initial' and not re.fullmatch(r'append_[0-9]{3,}', batch):
        raise ValueError('batch는 initial 또는 append_001 형식이어야 합니다.')
    folder = OUTPUT / batch
    if not folder.is_dir():
        raise FileNotFoundError(f'생성된 폴더 없음: {folder}')
    if sync_existing_thumbnails and batch != 'initial':
        raise ValueError('--sync-existing-thumbnails는 초기 배치에서만 사용할 수 있습니다.')
    state = json.loads((OUTPUT / 'state.json').read_text(encoding='utf-8'))
    if state.get('catalog_sha256') != hashlib.sha256(DATA.read_bytes()).hexdigest():
        raise ValueError('초기 배치와 현재 상품 카탈로그가 다릅니다.')
    rows = load(folder)
    local_products = {index: entry for index, entry in enumerate(read_catalog(), start=1)}
    validate_batch(rows, batch, local_products)
    engine.echo = False
    with engine.begin() as conn:
        if engine.dialect.name != 'postgresql':
            raise ValueError('개발용 PostgreSQL gtec DB에서 실행하세요.')
        if not apply:
            conn.exec_driver_sql('SET TRANSACTION READ ONLY')
        db, schema = conn.execute(text('SELECT current_database(), current_schema()')).one()
        if db != 'gtec' or schema != 'public' or (apply and confirm_db != db):
            raise ValueError('대상은 gtec/public입니다. 실제 반영에는 --confirm-db gtec를 지정하세요.')
        if apply:
            conn.execute(text('SELECT pg_advisory_xact_lock(327150, 112019)'))

        meta = MetaData()
        tables = {name: Table(DB_TABLE.get(name, name), meta, schema='public', autoload_with=conn)
                  for name in TABLES if rows[name] or name in {'products', 'members'}}
        preflight(tables, rows)
        verify_previous_batches(conn, tables['orders'], batch)
        numbers = [order['order_number'] for order in rows['orders']]
        matching_orders = order_matches(conn, tables['orders'], numbers)
        if matching_orders:
            state_label = '이미 반영됨' if matching_orders == len(numbers) else '부분 중복'
            raise ValueError(f'{batch}: {state_label} ({matching_orders}/{len(numbers)} 주문). 중복 적용을 중단합니다.')

        member_table = tables['members']
        existing_members = conn.execute(select(
            member_table.c.id, member_table.c.login_id, member_table.c.email, member_table.c.role,
            (member_table.c.password == '!DEMO_ACCOUNT_LOGIN_DISABLED!').label('generated')
        )).all()
        old_member = {row.login_id: row for row in existing_members}
        old_email = {row.email for row in existing_members}
        for row in rows['members']:
            if row['login_id'] in old_member or row['email'] in old_email:
                raise ValueError(f'중복 시연 회원 계정: {row["login_id"]}')
        new_member_ids = {int(row['id']) for row in rows['members']}
        member_ids = {}
        for order in rows['orders']:
            local_id = int(order['member_id'])
            if local_id in new_member_ids or local_id in member_ids:
                continue
            existing = old_member.get(f'demo_{local_id:06d}')
            if not existing or not existing.generated or existing.role != 'USER':
                raise ValueError(f'선행 배치의 합성 회원을 찾을 수 없습니다: demo_{local_id:06d}')
            member_ids[local_id] = existing.id

        products = tables['products']
        existing_products = conn.execute(select(products.c.id, products.c.category, products.c.name, products.c.thumbnail_url)).mappings()
        old_product = {}
        duplicate_products = set()
        for row in existing_products:
            key = product_key(row)
            if key in old_product:
                duplicate_products.add(key)
            old_product[key] = row
        product_ids = {}
        thumbnail_updates = {}
        pending_products = {int(row['id']): row for row in rows['products']}
        for local_id, product in local_products.items():
            key = product_key(product)
            if key in duplicate_products:
                raise ValueError(f'상품 참조가 모호합니다. 동일 카테고리·상품명이 여러 건입니다: {product["name"]}')
            found = old_product.get(key)
            if found is None and local_id not in pending_products:
                raise ValueError(f'선행 배치의 상품이 DB에 없습니다: {product["name"]}')
            if found is not None:
                product_ids[local_id] = found['id']
                if batch == 'initial' and found['thumbnail_url'] != product['thumbnail_url']:
                    thumbnail_updates[found['id']] = (product['name'], product['thumbnail_url'])

        existing_images = {}
        previous_primary = []
        if rows['images'] and product_ids:
            images = tables['images']
            primary_by_product = {product_id: local_products[local_id] for local_id, product_id in product_ids.items()}
            for image in conn.execute(select(images).where(images.c.product_id.in_(product_ids.values()))).mappings():
                key = image['product_id'], image['image_url']
                if key in existing_images:
                    raise ValueError(f'기존 상품의 이미지 URL이 중복되어 있습니다: 상품 ID {image["product_id"]}')
                existing_images[key] = image
                product = primary_by_product[image['product_id']]
                if image['is_primary'] and image['image_url'] != product['thumbnail_url']:
                    previous_primary.append(image['id'])
                    thumbnail_updates[image['product_id']] = (product['name'], product['thumbnail_url'])

        if thumbnail_updates:
            print('대표 이미지 동기화 대상:', ', '.join(name for name, _ in thumbnail_updates.values()))
            if not sync_existing_thumbnails:
                raise ValueError('기존 대표 이미지 변경을 검토하려면 --sync-existing-thumbnails를 추가해 미리보기를 실행하세요.')

        admin_id = None
        if rows['notices'] or rows['faqs']:
            admin_id = conn.execute(select(member_table.c.id).where(
                member_table.c.role == 'ADMIN', member_table.c.status == 'ACTIVE'
            ).order_by(member_table.c.id).limit(1)).scalar()
            if admin_id is None:
                raise ValueError('공지와 FAQ를 작성할 활성 관리자 계정이 없습니다.')

        print(f'DB={db} / batch={batch} / dry_run={not apply}')
        print('배치 수량:', {key: len(values) for key, values in rows.items() if values})
        print(f'상품: {len(pending_products.keys() - product_ids.keys())}개 신규 / {len(product_ids)}개 기존 ID 사용')
        print('이미지 연결 테이블: public.product_images / 가상 결제키: NULL')
        if not apply:
            return
        order_ids, item_ids = {}, {}
        for row in rows['members']:
            result = conn.execute(insert(member_table).values(**payload(member_table, row)).returning(member_table.c.id))
            member_ids[int(row['id'])] = result.scalar_one()
        for local_id, row in pending_products.items():
            if local_id not in product_ids:
                result = conn.execute(insert(products).values(**payload(products, row)).returning(products.c.id))
                product_ids[local_id] = result.scalar_one()
        if rows['images']:
            images = tables['images']
            for product_id, (_, url) in thumbnail_updates.items():
                conn.execute(update(products).where(products.c.id == product_id).values(thumbnail_url=url))
            if previous_primary:
                conn.execute(update(images).where(images.c.id.in_(previous_primary)).values(is_primary=False))
            for row in rows['images']:
                product_id = product_ids[int(row['product_id'])]
                existing_image = existing_images.get((product_id, row['image_url']))
                values = payload(images, row)
                if existing_image is None:
                    values['product_id'] = product_id
                    conn.execute(insert(images).values(**values))
                elif values['is_primary'] and (not existing_image['is_primary'] or existing_image['sort_order'] != values['sort_order']):
                    conn.execute(update(images).where(images.c.id == existing_image['id']).values(
                        is_primary=True, sort_order=values['sort_order'])
                    )
        for x in rows['orders']:
            dat=payload(tables['orders'],x);dat['member_id']=member_ids[int(x['member_id'])]
            res=conn.execute(insert(tables['orders']).values(**dat).returning(tables['orders'].c.id))
            order_ids[int(x['id'])]=res.scalar_one()
        # FK는 주문 INSERT 후 반환된 실제 PK로 치환합니다.
        # 결제 키는 항상 NULL이며 실제 Toss 서버로 어떤 요청도 보내지 않습니다.
        for x in rows['payments']:
            dat=payload(tables['payments'],x)
            if dat.get('payment_key') is not None:
                raise ValueError('시연 결제에는 payment_key를 넣을 수 없습니다.')
            dat['order_id']=order_ids[int(x['order_id'])]
            conn.execute(insert(tables['payments']).values(**dat))
        for x in rows['order_items']:
            dat=payload(tables['order_items'],x)
            dat['order_id']=order_ids[int(x['order_id'])]
            dat['product_id']=product_ids[int(x['product_id'])]
            res=conn.execute(insert(tables['order_items']).values(**dat).returning(tables['order_items'].c.id))
            item_ids[int(x['id'])]=res.scalar_one()
        for x in rows['deliveries']:
            dat=payload(tables['deliveries'],x);dat['order_id']=order_ids[int(x['order_id'])]
            conn.execute(insert(tables['deliveries']).values(**dat))
        for x in rows['reviews']:
            dat=payload(tables['reviews'],x)
            dat['member_id']=member_ids[int(x['member_id'])]
            dat['order_item_id']=item_ids[int(x['order_item_id'])]
            dat['product_id']=product_ids[int(x['product_id'])]
            conn.execute(insert(tables['reviews']).values(**dat))
        for x in rows['return_requests']:
            dat=payload(tables['return_requests'],x)
            dat['order_id']=order_ids[int(x['order_id'])]
            dat['order_item_id']=item_ids[int(x['order_item_id'])]
            conn.execute(insert(tables['return_requests']).values(**dat))
        for name in ('notices', 'faqs'):
            for row in rows[name]:
                values = payload(tables[name], row)
                values['member_id'] = admin_id
                conn.execute(insert(tables[name]).values(**values))
    print('[SUCCESS] 트랜잭션 완료.')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('batch',nargs='?',help='initial 또는 append_001')
    p.add_argument('--schema-report',action='store_true',help='현재 DB의 테이블/필수 컬럼만 읽어서 표시')
    p.add_argument('--apply',action='store_true')
    p.add_argument('--confirm-db',default=None)
    p.add_argument('--sync-existing-thumbnails', action='store_true', help='초기 카탈로그와 일치하는 기존 상품의 대표 이미지 변경 허용')
    a=p.parse_args()
    if a.schema_report:
        schema_report()
    elif a.batch:
        try:
            main(a.batch, a.apply, a.confirm_db, a.sync_existing_thumbnails)
        except (ValueError, OSError) as error:
            p.exit(1, f'{error}\n')
    else:
        p.error('batch를 지정하거나 --schema-report를 사용하세요')
