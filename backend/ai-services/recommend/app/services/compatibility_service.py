"""확인된 규격만 비교하는 보수적 PC 부품 호환성 검사.

COMPATIBLE = 검사 가능한 조합 규칙이 맞음 (시스템 전체 호환성 보장은 아님)
INCOMPATIBLE = 확인된 규격끼리 명백히 불일치함
UNKNOWN = 필요한 규격 부족 또는 아직 지원하지 않는 조합
"""
import re


def parse_spec(text):
    return {k.strip():v.strip() for k,v in
            re.findall(r'^([A-Z][A-Z0-9_]*):[ \t]*(.*)$',text or '',re.M)}


def _float(x):
    try:return float(x)
    except (ValueError,TypeError):return None


def _check(results, kind, a, va, b, vb, *, relation='eq', label=None):
    if va is None or vb is None:
        results.append({'rule':kind,'status':'UNKNOWN','reason':'필수 사양 누락'})
        return
    if relation=='eq':valid=str(va).upper()==str(vb).upper()
    elif relation=='allowed':valid=str(va).upper() in [v.strip().upper() for v in str(vb).split(',')]
    elif relation=='le':valid=(_float(va) is not None and _float(vb) is not None and _float(va)<=_float(vb))
    else:raise ValueError(relation)
    verdict = ('PASS' if valid else 'CAUTION') if kind == 'GPU_PSU_GUIDELINE' else ('PASS' if valid else 'FAIL')
    results.append({'rule':kind,'status':verdict,
                    'left':a,'left_value':va,'right':b,'right_value':vb})


def evaluate(products):
    catalog={str(p['category']).upper():parse_spec(p.get('specification')) for p in products}
    results=[]
    def compare(cat1,key1,cat2,key2,rule,mode='eq'):
        if cat1 in catalog and cat2 in catalog:
            _check(results,rule,cat1,catalog[cat1].get(key1),cat2,catalog[cat2].get(key2),relation=mode)
    compare('CPU','CPU_SOCKET','MAINBOARD','CPU_SOCKET','CPU_MAINBOARD_SOCKET')
    compare('RAM','RAM_TYPE','MAINBOARD','RAM_TYPE','RAM_MAINBOARD_TYPE')
    compare('MAINBOARD','FORM_FACTOR','CASE','MAINBOARD_SUPPORT','BOARD_FITS_CASE','allowed')
    compare('GPU','GPU_LENGTH_MM','CASE','MAX_GPU_LENGTH_MM','GPU_FITS_CASE','le')
    compare('POWER','PSU_FORM_FACTOR','CASE','PSU_SUPPORT','PSU_FITS_CASE_FORM','allowed')
    compare('POWER','PSU_LENGTH_MM','CASE','MAX_PSU_LENGTH_MM','PSU_FITS_CASE_LENGTH','le')
    compare('GPU','GPU_RECOMMENDED_PSU_W','POWER','PSU_WATT','GPU_PSU_GUIDELINE','le')
    if 'SSD' in catalog and 'MAINBOARD' in catalog:
        needed='M2_NVME_SUPPORTED' if catalog['SSD'].get('STORAGE_INTERFACE')=='NVME' else 'SATA_SUPPORTED'
        _check(results,'SSD_BOARD_INTERFACE_SUPPORT','SSD','YES','MAINBOARD',catalog['MAINBOARD'].get(needed))
    if 'HDD' in catalog and 'MAINBOARD' in catalog:
        _check(results,'HDD_BOARD_SATA_SUPPORT','HDD','YES','MAINBOARD',catalog['MAINBOARD'].get('SATA_SUPPORTED'))
    verdict='INCOMPATIBLE' if any(x['status']=='FAIL' for x in results) else (
            'UNKNOWN' if not results or any(x['status']=='UNKNOWN' for x in results) else (
            'CAUTION' if any(x['status']=='CAUTION' for x in results) else 'COMPATIBLE'))
    return {'status':verdict,'checks':results,
            'note':'상품 사양에서 확인 가능한 규칙만 검사합니다. 미확인 커넥터·BIOS·쿨러 등은 보장하지 않습니다.'}
