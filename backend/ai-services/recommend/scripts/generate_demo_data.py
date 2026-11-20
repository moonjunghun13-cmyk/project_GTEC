"""GTEC 쇼핑몰 더미 데이터 생성기 (CSV 사전 검토용, 실제 DB에 INSERT하지 않음).

처음 1회: python -m scripts.generate_demo_data init
이후 증분: python -m scripts.generate_demo_data append

출력은 generated_demo/ 폴더에 생성됩니다. 앱이 시작될 때 실행하지 마세요.
CSV id들은 생성기 내부의 참조 ID이며 실제 DB PK가 아닙니다.
DB 반영은 import_demo_data.py가 수행하며, 기본적으로 읽기 전용 점검만 합니다.
"""
from __future__ import annotations
import argparse
import csv
import json
import random
import secrets
import hashlib
import os
import tempfile
from contextlib import contextmanager
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'/'real_products_120.csv'
OUT=ROOT/'generated_demo'
M0=1000; O0=10000; R0=5000; N0=100; F0=25; RETURN0=20
MI=100; OI=1000; RI=500


def write_csv(path,rows,columns):
    path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=columns,extrasaction='ignore');w.writeheader();w.writerows(rows)


def csvrows(name,rows):
    if rows:write_csv(name,rows,list(rows[0]))


def strdt(v):return v.strftime('%Y-%m-%d %H:%M:%S') if v else ''


def read_catalog():
    with DATA.open(encoding='utf-8-sig',newline='') as f:
        products=list(csv.DictReader(f))
    if len(products)!=120:raise ValueError('상품이 120개가 아닙니다')
    return products


def rand_at(rng, now, oldest_days=360, newest_days=3):
    return now - timedelta(days=rng.uniform(newest_days, oldest_days))


def member_row(mid, rng, now, mode):
    dt = rand_at(rng, now, 900, 365) if mode == 'init' else rand_at(rng, now, 60, 16)
    # Login deliberately disabled until accounts are created through Spring Security.
    return {'id':mid,'login_id':f'demo_{mid:06d}', 'name':f'시연회원{mid}',
            'password':'!DEMO_ACCOUNT_LOGIN_DISABLED!',
            'email':f'demo_{mid:06d}@example.invalid','tel':f'010{rng.randrange(10000000,99999999)}',
            'oauth_provider':'','oauth_id':'','terms_agreed':True,'privacy_agreed':True,
            'role':'USER','status':'ACTIVE','created_at':strdt(dt),'updated_at':strdt(dt)}


def payment_from_order(order):
    """한 시연 주문에 대응하는 *가상* 결제 정보. 실제 Toss 승인/취소에 사용 금지.

    과거 initial CSV에서도 같은 함수로 메모리 내 결제행을 복원합니다.
    모든 가상 payment_key는 NULL 처리해 실제 Toss 취소 API 호출을 막습니다.
    """
    order_status=(order.get('status') or '').strip().upper()
    # 시연 생성기는 CANCELLED를 결제 *이전* 취소로 사용합니다.
    if order_status=='CANCELLED':
        if order.get('paid_at'):
            raise ValueError(f"결제 후 취소 주문은 별도 확인이 필요합니다: {order.get('order_number')}")
        return None
    if order_status=='PENDING':
        if order.get('paid_at'):
            raise ValueError(f"PENDING 주문에 paid_at이 존재합니다: {order.get('order_number')}")
        state='READY'
    elif order_status in {'PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED'}:
        state='DONE'
    elif order_status=='REFUNDED':
        state='CANCELED'
    else:
        raise ValueError(f"미지원 주문 상태: {order_status!r} ({order.get('order_number')})")
    requested=order.get('created_at')
    approved=order.get('paid_at') or ''
    if state in {'DONE','CANCELED'} and not approved:
        raise ValueError(f"결제 완료/환불 주문에 paid_at이 없습니다: {order.get('order_number')}")
    if not requested or not order.get('updated_at') or not order.get('total_amount'):
        raise ValueError(f"결제 필수 정보 누락: {order.get('order_number')}")
    return {
        'order_id':order['id'],
        'payment_key':'',  # SQL NULL. 실제 Toss 결제 키를 절대로 합성하지 않습니다.
        'method':order.get('payment_method') or '',
        'amount':order['total_amount'],
        'status':state,
        'requested_at':requested,
        'approved_at':approved if state!='READY' else '',
        'canceled_at':(order.get('cancelled_at') or order.get('updated_at')) if state=='CANCELED' else '',
        'receipt_url':'',
        'created_at':requested,
        'updated_at':order.get('updated_at'),
    }


@contextmanager
def generation_lock():
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / '.generate.lock').open('a+b') as lock:
        lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise ValueError('다른 더미 데이터 배치를 생성 중입니다.') from exc
        try:
            yield
        finally:
            lock.seek(0)
            if os.name == 'nt':
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock, fcntl.LOCK_UN)


def save_state(path, state):
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
    temporary.replace(path)


def existing_summary(folder):
    summary = json.loads((folder / 'summary.json').read_text(encoding='utf-8'))
    return {**summary, 'batch': folder.name, 'reused': True}


def generate_batch(mode='init', seed=None):
    if mode not in {'init', 'append'}:
        raise ValueError('init 또는 append를 지정하세요.')
    with generation_lock():
        return generate_locked(mode, seed)


def generate_locked(mode, seed):
    now = datetime.now()
    state_path = OUT / 'state.json'
    initial = OUT / 'initial'
    catalog_digest = hashlib.sha256(DATA.read_bytes()).hexdigest()
    current = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else None
    if current is not None and current.get('catalog_sha256') != catalog_digest:
        raise ValueError('초기 배치의 상품 카탈로그와 현재 파일이 다릅니다.')
    if current is not None and not initial.is_dir():
        raise ValueError('상태 파일에 대응하는 초기 배치 폴더가 없습니다.')

    # If interrupted after publishing the folder, resume from its committed data.
    next_run = current['run'] + 1 if current is not None else 1
    pending = OUT / ('initial' if next_run == 1 else f'append_{next_run - 1:03d}')
    if pending.is_dir():
        checkpoint = pending / '.generation-state.json'
        if not checkpoint.is_file():
            raise ValueError(f'{pending.name} 배치와 상태 파일이 일치하지 않습니다.')
        successor = json.loads(checkpoint.read_text(encoding='utf-8'))
        if successor.get('run') != next_run or successor.get('catalog_sha256') != catalog_digest:
            raise ValueError(f'{pending.name} 배치의 상태 파일이 올바르지 않습니다.')
        result = existing_summary(pending)
        save_state(state_path, successor)
        if mode == 'append' or next_run == 1:
            return result
        current = successor

    if mode == 'init' and current is not None:
        return existing_summary(initial)
    if mode == 'append' and current is None:
        raise ValueError('초기 배치가 없습니다. 먼저 초기 CSV를 생성하세요.')
    used_seed=seed if seed is not None else secrets.randbits(64)
    rng=random.Random(used_seed)
    catalog=read_catalog()
    catalog_sha256=catalog_digest
    if mode=='init':
        state={'run':0,'catalog_sha256':catalog_sha256,'next_member':1,'next_product':1,'next_order':1,'next_item':1,'next_delivery':1,
               'next_review':1,'next_return':1,'next_image':1,'member_ids':[],
               'reviewed_items':[]}
        counts=(M0,O0,R0)
    else:
        state=current
        counts=(MI,OI,RI)
    state['run']+=1
    folder=OUT/('initial' if mode=='init' else f'append_{state["run"]-1:03d}')
    if folder.exists():
        raise ValueError(f'{folder.name} 배치가 이미 존재합니다.')
    members=[]
    for _ in range(counts[0]):
        mid=state['next_member'];state['next_member']+=1
        members.append(member_row(mid,rng,now,mode))
        state['member_ids'].append(mid)
    member_joined = {member['id']: datetime.fromisoformat(member['created_at']) for member in members}
    products=[];images=[]
    if mode=='init':
        for r in catalog:
            pid=state['next_product'];state['next_product']+=1
            p={'id':pid,'name':r['name'],'category':r['category'],'stock':int(r['stock']),
               'description':r['description'],'specification':r['specification'],
               'price':int(r['price']),'status':'ACTIVE','created_at':strdt(now),
               'updated_at':strdt(now),'thumbnail_url':r['thumbnail_url']}
            products.append(p)
            urls=r['image_urls'].split('|')
            for idx,url in enumerate(urls):
                imgid=state['next_image'];state['next_image']+=1
                images.append({'id':imgid,'product_id':pid,'image_url':url,'is_primary':idx==0,'sort_order':idx})
    catalog_by_id={i+1:c for i,c in enumerate(catalog)}
    member_weights={mid:rng.gammavariate(0.35,1) for mid in state['member_ids']}
    members_ids=list(member_weights);weights=list(member_weights.values())
    cat_weights={c:rng.gammavariate(1.2,1) for c in sorted({row['category'] for row in catalog})}
    # gamma distribution re-drawn each run, not a fixed GPU or CPU allocation.
    prod_weights=[cat_weights[c['category']]*rng.gammavariate(1.3,1) for c in catalog]
    product_ids=list(catalog_by_id)
    orders=[];items=[];deliveries=[];completed_items=[];return_candidates=[]
    statuses=['COMPLETED','DELIVERED','SHIPPED','PREPARING','PAID','CANCELLED','REFUNDED']
    status_weights=[68,9,7,5,5,4,2]
    for _ in range(counts[1]):
        oid=state['next_order'];state['next_order']+=1
        mid=rng.choices(members_ids,weights)[0]
        status=rng.choices(statuses,status_weights)[0]
        # 구매 확정/배송 완료 주문의 배송·리뷰 날짜가 미래가 되지 않도록 생성 범위 제한
        oldest_days = 360 if mode == 'init' else 30
        dt = rand_at(rng, now, oldest_days, 15 if status in ('COMPLETED', 'DELIVERED', 'REFUNDED') else 2)
        if mid in member_joined:
            dt = max(dt, member_joined[mid])
        chosen=[]
        n_items=rng.choices([1,2,3,4],[45,37,14,4])[0]
        while len(chosen)<n_items:
            pid=rng.choices(product_ids,prod_weights)[0]
            if pid not in chosen:chosen.append(pid)
        subtotal=0;order_item_records=[]
        for pid in chosen:
            p=catalog_by_id[pid];qty=rng.choices([1,2,3],[82,15,3])[0];price=int(p['price'])
            iid=state['next_item'];state['next_item']+=1
            subtotal+=price*qty
            item={'id':iid,'order_id':oid,'product_id':pid,'product_name':p['name'][:100],
                  'unit_price':price,'total_price':price*qty,'quantity':qty,'created_at':strdt(dt)}
            items.append(item);order_item_records.append(item)
        shipping=0 if subtotal>=50000 else 3000
        discount=rng.choice([0,0,0,1000,2000])
        discount=min(discount,subtotal)
        paid=dt+timedelta(minutes=rng.randint(1,10))
        paid_date=strdt(paid) if status not in ('CANCELLED',) else ''
        # Order의 필수 배송지와 Delivery의 배송지 정보를 동일하게 생성합니다.
        shipping_name=f'시연회원{mid}'
        shipping_phone=f'010{rng.randrange(10000000,99999999)}'
        shipping_zipcode=f'{rng.randrange(10000,99999)}'
        shipping_address1='서울특별시 가상구 테스트로 10'
        shipping_address2=f'{rng.randrange(100,999)}호'
        # Refund occurs after payment and delivery in a completed synthetic flow.
        closed_at = paid + timedelta(days=6) if status == 'REFUNDED' else paid
        orders.append({'id':oid,'order_number':f'DEMO-{oid:010d}','member_id':mid,'status':status,
                       'shipping_name':shipping_name,'shipping_phone':shipping_phone,
                       'shipping_zipcode':shipping_zipcode,'shipping_address1':shipping_address1,
                       'shipping_address2':shipping_address2,
                       'sub_total':subtotal,'shipping_fee':shipping,'discount_amount':discount,
                       'total_amount':subtotal+shipping-discount,
                       'payment_method':rng.choice(['CREDIT_CARD','BANK_TRANSFER','VIRTUAL_ACCOUNT','KAKAO_PAY','NAVER_PAY','TOSS']),
                       'payment_key':'',
                       'paid_at':paid_date,'cancel_requested_at':'','cancel_reason':'','cancelled_at':strdt(closed_at) if status in ('CANCELLED','REFUNDED') else '',
                       'created_at':strdt(dt),'updated_at':strdt(closed_at)})
        if status!='CANCELLED':
            did=state['next_delivery'];state['next_delivery']+=1
            shipped=paid+timedelta(days=1);delivered=shipped+timedelta(days=3)
            deliver_status='COMPLETED' if status in ('COMPLETED','DELIVERED','REFUNDED') else ('DELIVERING' if status=='SHIPPED' else 'PREPARING')
            deliveries.append({'id':did,'order_id':oid,
                 'carrier_code':'CJ','carrier_name':'CJ대한통운','invoice_number':f'DEMO{did:010d}' if deliver_status!='PREPARING' else '',
                 'status':deliver_status,'shipping_name':shipping_name,'shipping_phone':shipping_phone,
                 'shipping_zipcode':shipping_zipcode,'shipping_address1':shipping_address1,
                 'shipping_address2':shipping_address2,'delivery_memo':'',
                 'shipped_at':strdt(shipped) if deliver_status!='PREPARING' else '',
                 'delivered_at':strdt(delivered) if deliver_status=='COMPLETED' else '',
                 'estimated_at':delivered.date().isoformat()})
        if status=='COMPLETED':
            completed_items.extend((i,mid,dt) for i in order_item_records)
    # 카탈로그 상품의 시작 재고는 초기 주문 수량을 감당할 수 있게 구성합니다.
    # 단, CSV는 실제 DB INSERT용이 아니며 재고 반영은 추후 DB 적재 정책에 따릅니다.
    if products:
        sold_quantity=Counter()
        for item in items:sold_quantity[item['product_id']]+=item['quantity']
        for p in products:p['stock']=sold_quantity[p['id']]+rng.randint(100,400)
    # Reviews always use fresh completed order items, never an already reviewed order_item_id.
    reviewed=set(state['reviewed_items'])
    fresh=[(item,mid,dt) for item,mid,dt in completed_items if item['id'] not in reviewed]
    if len(fresh)<counts[2]:raise RuntimeError(f'완료 주문상품 {len(fresh)}개로 리뷰 {counts[2]}개 생성 불가')
    selected=rng.sample(fresh,counts[2]);reviews=[];labels=[]
    positive_fraction=rng.betavariate(2.5,2.5)
    topic={'GPU':'게임 프레임','CPU':'처리 속도','MAINBOARD':'구성품','RAM':'안정성','SSD':'파일 전송 속도',
           'HDD':'용량과 소음','POWER':'전원 안정성','CASE':'조립 공간','MONITOR':'화질','KEYBOARD':'키감',
           'MOUSE':'그립감','SPEAKER':'음질'}
    pos=['생각보다 만족스럽습니다','기대했던 만큼 잘 작동합니다','설치가 간편했고 만족스럽네요','사용감이 꽤 좋았습니다',
         '문제 없이 잘 사용 중입니다','기대한 성능이 나옵니다','구매해도 괜찮은 제품입니다']
    neg=['기대에 미치지 못했습니다','아쉬운 점이 많습니다','생각보다 불편합니다','품질이 조금 아쉽습니다',
         '사용하면서 문제가 있었습니다','다시 구매할 것 같지는 않습니다','제품 완성도가 아쉽네요']
    lead=['일주일 사용해 보니','이번에 새 PC를 맞추면서','기존 제품과 비교해 보니','직접 설치해 보니까',
          '하루 정도 써 봤는데','구매 후 며칠 써 보면서','배송받고 테스트해 봤는데']
    tail=['배송은 빨랐어요.','포장은 무난했습니다.','디자인은 마음에 듭니다.','가격은 조금 고민됐어요.',
          '다른 제품과 비교해 봐야겠습니다.','세팅 과정은 어렵지 않았어요.','소음도 확인해 봤습니다.']
    for item,mid,dt in selected:
        rid=state['next_review'];state['next_review']+=1
        positive=rng.random()<positive_fraction
        text=f'{rng.choice(lead)} {topic.get(catalog_by_id[item["product_id"]]["category"],"제품 성능")}이(가) {rng.choice(pos if positive else neg)}. {rng.choice(tail)}'
        rdate=min(now,dt+timedelta(days=rng.randint(7,60)))
        reviews.append({'id':rid,'member_id':mid,'product_id':item['product_id'],
              'order_item_id':item['id'],
              'content':text,'created_at':strdt(rdate),'updated_at':strdt(rdate)})
        labels.append({'review_id':rid,'intended_label':'POSITIVE' if positive else 'NEGATIVE',
                       'label_source':'SYNTHETIC_GENERATOR_NOT_HUMAN_VERIFIED'})
        reviewed.add(item['id'])
    state['reviewed_items']=sorted(reviewed)
    ret=[]
    if mode=='init':
        for item,mid,dt in rng.sample(completed_items,RETURN0):
            retid=state['next_return'];state['next_return']+=1
            st=rng.choice(['REQUESTED','REJECTED','APPROVED'])
            rdate=min(now,dt+timedelta(days=10))
            ret.append({'id':retid,'order_id':item['order_id'],'order_item_id':item['id'],
                        'quantity':1,'reason':rng.choice(['초기 불량','단순 변심','배송 중 제품 손상','호환성 문제']),
                        'status':st,'refund_amount':int(item['unit_price']) if st=='APPROVED' else '',
                        'requested_at':strdt(rdate),'processed_at':strdt(min(now,rdate+timedelta(days=2))) if st!='REQUESTED' else '',
                        'refunded_at':''})
    notice=[];faq=[]
    if mode=='init':
        # no fabricated admin account: notice author refers to a generated demo USER, but must be mapped to an authorized admin on DB import.
        admin_draft_id=state['member_ids'][0]
        notice=[{'id':i,'member_id':admin_draft_id,'title':f'시연 공지사항 {i:03d}',
                 'content':rng.choice(['배송 일정 안내','서비스 점검 안내','상품 입고 안내','교환 및 반품 안내'])+' - 시연용 데이터입니다.',
                 'created_at':strdt(now-timedelta(days=rng.randint(0,180))),'updated_at':strdt(now)} for i in range(1,N0+1)]
        faq=[{'id':i,'member_id':admin_draft_id,'title':rng.choice(['배송은 얼마나 걸리나요?','반품은 어떻게 신청하나요?','회원가입이 필요한가요?','결제 수단은 무엇인가요?']),
              'content':'시연용 FAQ 답변입니다. 실제 쇼핑몰 정책과 다를 수 있습니다.',
              'created_at':strdt(now-timedelta(days=rng.randint(0,180))),'updated_at':strdt(now)} for i in range(1,F0+1)]
    # 결제 데이터는 별도 payments 테이블에 저장합니다. 가상 승인 기록만 만들고,
    # 실제 토스페이먼츠에 승인/취소 요청하지 않습니다.
    payments=[p for order in orders if (p:=payment_from_order(order)) is not None]
    batches={'members':members,'products':products,'images':images,'orders':orders,'payments':payments,
             'order_items':items,'deliveries':deliveries,'reviews':reviews,'review_training_labels':labels,
             'return_requests':ret,'notices':notice,'faqs':faq}
    summary={'mode':mode,'batch':folder.name,'reused':False,'generated_at':strdt(now),'member_count':len(members),'product_count':len(products),'image_count':len(images),
             'order_count':len(orders),'payment_count':len(payments),'order_item_count':len(items),'delivery_count':len(deliveries),
             'review_count':len(reviews),'positive_ratio':round(sum(x['intended_label']=='POSITIVE' for x in labels)/len(labels),4),
             'return_count':len(ret),'notice_count':len(notice),'faq_count':len(faq),'seed':used_seed,
             'category_item_counts':dict(Counter(catalog_by_id[i['product_id']]['category'] for i in items)),
             'warning':'CSV 내부 ID는 실제 DB PK가 아닙니다. 참조 ID 재매핑 없이 직접 INSERT하지 마세요.'}
    with tempfile.TemporaryDirectory(prefix='.batch-', dir=OUT) as staging:
        draft = Path(staging) / folder.name
        draft.mkdir()
        for name, rows in batches.items():
            csvrows(draft / f'{name}.csv', rows)
        (draft / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
        (draft / '.generation-state.json').write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
        draft.rename(folder)
    save_state(state_path, state)
    return summary


def main(mode='init', seed=None):
    result = generate_batch(mode, seed)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', nargs='?', choices=['init', 'append'], default='init')
    parser.add_argument('--seed', type=int, help='재현용 시드. 생략하면 매번 새 난수 시드를 사용합니다.')
    args = parser.parse_args()
    try:
        main(args.mode, args.seed)
    except (ValueError, OSError) as error:
        parser.exit(1, f'{error}\n')
