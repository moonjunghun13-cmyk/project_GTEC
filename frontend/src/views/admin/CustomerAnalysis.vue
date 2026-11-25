<script setup>
import {computed,nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import AdminChart from '../../components/admin/AdminChart.vue'
import CategoryCustomerBreakdown from '../../components/admin/CategoryCustomerBreakdown.vue'
import StatePanel from '../../components/StatePanel.vue'
import {money} from '../../utils'
import {getCustomerInsights,getCustomerModelStatus,refreshCustomerModel} from '../../services'
import {buildLiveCustomerReport,buildPreviewCustomerReport} from '../../services/customerAnalytics'
const props=defineProps({data:{type:Object,required:true},preview:Boolean})
const apiMode=computed(()=>(import.meta.env.VITE_AUTH_MODE||'api')==='api'&&!props.preview)
const insights=ref(null),insightBusy=ref(false),insightError=ref(''),refreshing=ref(false),refreshNotice=ref('')
const training=ref(null),trainingBusy=ref(false),trainingError=ref('')
const report=computed(()=>apiMode.value?buildLiveCustomerReport(insights.value,props.data.members):buildPreviewCustomerReport(props.data))
async function loadInsights(){insightBusy.value=true;insightError.value='';try{insights.value=await getCustomerInsights()}catch(e){insightError.value=e.message}finally{insightBusy.value=false}}
async function loadTraining(event){if(!event.target.open||training.value||trainingBusy.value)return;trainingBusy.value=true;trainingError.value='';try{training.value=await getCustomerModelStatus()}catch(e){trainingError.value=e.message}finally{trainingBusy.value=false}}
async function refreshModel(){if(refreshing.value)return;refreshing.value=true;refreshNotice.value='';try{const result=await refreshCustomerModel();refreshNotice.value=result.note||(result.active_model_changed?'사용 모델이 최신화되었습니다.':'최신화 검토를 완료했습니다. 사용 모델 변경 여부는 서버 결과를 따릅니다.');if(props.preview)refreshNotice.value+=' (실제 서버 데이터 기준)';training.value=null;if(apiMode.value)await loadInsights()}catch(e){refreshNotice.value=e.message}finally{refreshing.value=false}}
defineExpose({refreshModel,refreshing,insightBusy})
const overviewQuery=ref(''),overviewSearch=ref(''),overviewFilter=ref('all'),overviewSort=ref('amount'),overviewPage=ref(1)
const predictionQuery=ref(''),predictionSearch=ref(''),predictionFilter=ref('all'),predictionSort=ref('high'),predictionPage=ref(1)
const pageSize=20
const match=(row,query)=>`${row.id} ${row.name} ${row.email}`.toLowerCase().includes(query.trim().toLowerCase())
const overviewRows=computed(()=>report.value.customers.filter(row=>match(row,overviewSearch.value)&&(overviewFilter.value==='all'||overviewFilter.value==='repeat'&&row.purchaseCount>=2||overviewFilter.value==='once'&&row.purchaseCount===1||overviewFilter.value==='none'&&row.known&&row.purchaseCount===0)).sort((a,b)=>overviewSort.value==='name'?a.name.localeCompare(b.name,'ko'):(overviewSort.value==='count'?(b.purchaseCount??-1)-(a.purchaseCount??-1):(b.itemAmount??-1)-(a.itemAmount??-1))||a.name.localeCompare(b.name,'ko')))
const predictionRows=computed(()=>report.value.predictions.rows.filter(row=>match(row,predictionSearch.value)&&(predictionFilter.value==='all'||predictionFilter.value==='buy'&&row.predictedBuy===true||predictionFilter.value==='attention'&&row.attention===true)).sort((a,b)=>predictionSort.value==='recent'?(a.recencyDays??Infinity)-(b.recencyDays??Infinity):predictionSort.value==='low'?(a.score??Infinity)-(b.score??Infinity):(b.score??-1)-(a.score??-1)))
const overviewPages=computed(()=>Math.max(1,Math.ceil(overviewRows.value.length/pageSize))),predictionPages=computed(()=>Math.max(1,Math.ceil(predictionRows.value.length/pageSize)))
const overviewVisible=computed(()=>overviewRows.value.slice((overviewPage.value-1)*pageSize,overviewPage.value*pageSize)),predictionVisible=computed(()=>predictionRows.value.slice((predictionPage.value-1)*pageSize,predictionPage.value*pageSize))
watch([overviewSearch,overviewFilter,overviewSort],()=>overviewPage.value=1)
watch([predictionSearch,predictionFilter,predictionSort],()=>predictionPage.value=1)
watch(overviewPages,n=>overviewPage.value=Math.min(overviewPage.value,n))
watch(predictionPages,n=>predictionPage.value=Math.min(predictionPage.value,n))
const monthRange=ref('12'),months=computed(()=>report.value.retention.months.slice(-Number(monthRange.value)))
const count=value=>value===null||value===undefined?'—':Number(value).toLocaleString('ko-KR')
const amount=value=>value===null||value===undefined?'집계 미제공':money(value)
const rate=value=>value===null||value===undefined?'산출 불가':`${Number(value).toFixed(1)}%`
const score=value=>value===null||value===undefined?'—':`${(value*100).toFixed(1)}점`
const selected=ref(null),customerDialog=ref(null)
async function openCustomer(row){selected.value=row;await nextTick();customerDialog.value.showModal()}
function closeCustomer(){customerDialog.value?.close();selected.value=null}
let observer
async function reveal(){await nextTick();observer?.disconnect();if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver'in window))return;const root=document.querySelector('.admin-content');observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}},{root,threshold:.05});for(const card of root?.querySelectorAll('.customer-section:not(.is-visible)')||[]){card.classList.add('reveal-pending');observer.observe(card)}}
onMounted(()=>{if(apiMode.value)loadInsights();reveal()})
watch(insightBusy,reveal,{flush:'post'})
onBeforeUnmount(()=>observer?.disconnect())
</script>
<template>
<section class="customer-analysis customer-report" aria-label="고객분석 보고서">
 <div class="report-toolbar"><p>{{ preview?'더미 데이터 분석':'실제 서버 분석' }} · 기준일 {{ report.asOf||'확인 중' }} · 일반 회원 기준</p><button v-if="apiMode" class="button" :disabled="insightBusy" @click="loadInsights">새로고침</button></div>
 <p v-if="refreshNotice" class="report-message" role="status">{{ refreshNotice }}</p>
 <StatePanel v-if="insightBusy||insightError" :busy="insightBusy" :error="insightError" @retry="loadInsights"/>
 <template v-if="!insightBusy && (!apiMode||insights)">
 <p v-for="(error,key) in report.errors" :key="key" class="report-message" role="alert">{{ {summary:'고객 현황',repurchase:'재구매율',retention:'유지율',predictions:'재구매 예측'}[key] }} 연결 실패 · {{ error }}</p>
 <div class="report-kpis"><article><span>구매 고객</span><strong>{{ count(report.summary.buyers) }}<small>명</small></strong><p>전체 일반 회원 {{ count(report.summary.registered) }}명</p></article><article><span>정상 구매 주문</span><strong>{{ count(report.summary.orderCount) }}<small>건</small></strong><p>취소·환불 완료 제외</p></article><article><span>총 결제 금액</span><strong class="metric-money">{{ report.summary.orderAmount===null?'—':money(report.summary.orderAmount) }}</strong><p>배송비·할인 반영 최종 금액</p></article><article><span>고객 재구매율</span><strong>{{ rate(report.repurchase.rate) }}</strong><p>재구매 고객 {{ count(report.repurchase.repeat) }}명</p></article></div>
 <article class="customer-section">
  <header><div><span class="section-number">CUSTOMER OVERVIEW</span><h2>고객 현황 분석</h2><p>{{ report.overviewPeriod }} · {{ report.overviewNote }}</p></div><span class="result-count">{{ overviewRows.length }}명</span></header>
  <form class="report-filters" @submit.prevent="overviewSearch=overviewQuery"><label>구매 구분<select v-model="overviewFilter"><option value="all">전체</option><option value="repeat">재구매 고객</option><option value="once">1회 구매 고객</option><option v-if="preview" value="none">미구매 고객</option></select></label><label>정렬<select v-model="overviewSort"><option value="amount">구매 금액순</option><option value="count">구매 횟수순</option><option value="name">이름순</option></select></label><label class="search-label">고객 검색<div class="report-search"><input v-model="overviewQuery" placeholder="이름, 이메일 또는 회원 ID"/><button class="button" type="submit">검색</button></div></label></form>
  <div class="report-table-wrap">
  <table class="report-table">
    <thead>
      <tr>
        <th>고객</th>
        <th>구매 상품</th>
        <th>구매 횟수</th>
        <th>상품 구매액</th>
        <th>상세</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in overviewVisible" :key="row.id">
        <td>
          <strong>{{ row.name }}</strong>
          <small>{{ row.email || `회원 ${row.id}` }}</small>
        </td>
        <td>
          <div v-if="row.items.length" class="purchase-summary">
            <img v-if="row.items[0].image" :src="row.items[0].image" alt="" />
            <span>
              {{ row.items[0].name }}
              <small v-if="row.items.length > 1">외 {{ row.items.length - 1 }}종</small>
            </span>
          </div>
          <span v-else-if="row.productsAvailable" class="muted">구매 내역 없음</span>
          <RouterLink v-else class="detail-button" to="/admin/orders">주문 상품 확인</RouterLink>
        </td>
        <td>{{ row.purchaseCount === null ? '집계 미제공' : `${count(row.purchaseCount)}회` }}</td>
        <td class="numeric">{{ amount(row.itemAmount) }}</td>
        <td>
          <button class="detail-button" @click="openCustomer(row)">상세 보기</button>
        </td>
      </tr>
      <tr v-if="!overviewVisible.length">
        <td colspan="5" class="empty-cell">조건에 맞는 고객이 없습니다.</td>
      </tr>
    </tbody>
  </table>
</div>
  <nav class="report-pagination" aria-label="고객 현황 페이지"><button :disabled="overviewPage===1" @click="overviewPage=1">처음</button><button :disabled="overviewPage===1" @click="overviewPage--">이전</button><strong>{{ overviewPage }} / {{ overviewPages }}</strong><button :disabled="overviewPage===overviewPages" @click="overviewPage++">다음</button><button :disabled="overviewPage===overviewPages" @click="overviewPage=overviewPages">마지막</button></nav>
 </article>
 <div class="customer-report-charts">
 <article class="customer-section"><header><div><span class="section-number">REPEAT PURCHASE</span><h2>고객 재구매율 분석</h2><p>1회 구매 고객과 재구매 고객의 구성</p></div></header><div class="repeat-headline"><strong>{{ rate(report.repurchase.rate) }}</strong><span>구매 고객 중 2회 이상 구매</span></div><AdminChart v-if="report.repurchase.buyers>0" large type="doughnut" :labels="['1회 구매','재구매']" :values="[report.repurchase.once,report.repurchase.repeat]" label="구매 고객 수 (명)"/><StatePanel v-else empty="재구매율을 산출할 구매 이력이 없습니다."/><div class="repeat-counts"><span>1회 구매 <b>{{ count(report.repurchase.once) }}명</b></span><span>재구매 <b>{{ count(report.repurchase.repeat) }}명</b></span></div><p class="report-footnote">{{ report.repurchase.definition }}</p></article>
 <article class="customer-section"><header><div><span class="section-number">MONTHLY RETENTION</span><h2>월별 고객 유지율</h2><p>지난달 고객이 이번 달에도 구매했나요?</p></div><select v-model="monthRange" aria-label="유지율 조회 기간"><option value="6">최근 6개월</option><option value="12">최근 12개월</option></select></header><AdminChart v-if="months.length" large percent comparison type="line" :labels="months.map(row=>row.month)" :values="months.map(row=>row.rate)" label="유지율 (%)"/><StatePanel v-else empty="월별 구매 이력이 충분하지 않습니다."/><p class="report-footnote">{{ report.retention.definition }} 전월 구매 고객이 없으면 산출하지 않습니다. 이번 달은 진행 중입니다.</p><details v-if="months.length" class="monthly-details"><summary>월별 수치 보기</summary><div class="report-table-wrap"><table class="report-table"><thead><tr><th>월</th><th>전월 고객</th><th>유지 고객</th><th>유지율</th></tr></thead><tbody><tr v-for="row in months" :key="row.month"><td>{{ row.month }}{{ row.partial?' · 진행 중':'' }}</td><td>{{ count(row.previous) }}명</td><td>{{ count(row.retained) }}명</td><td>{{ rate(row.rate) }}</td></tr></tbody></table></div></details></article>
 </div>
 <article class="customer-section"><header><div><span class="section-number">REPURCHASE FORECAST</span><h2>재구매 가능성 예측</h2><p>{{ report.predictions.baseMonth||'—' }} 말까지의 구매 이력 → {{ report.predictions.month||'—' }} 예측</p></div><span :class="['forecast-label',{demo:preview}]">{{ preview?'더미 예측 예시':'AI 모델 점수' }}</span></header><p class="report-footnote">{{ report.predictions.note }} 모델 점수는 실제 구매 확률과 다를 수 있습니다. 검토 후보는 이탈 확정이 아닙니다.</p>
 <form class="report-filters" @submit.prevent="predictionSearch=predictionQuery"><label>예측 구분<select v-model="predictionFilter"><option value="all">전체</option><option value="buy">재구매 예상</option><option value="attention">검토 후보</option></select></label><label>정렬<select v-model="predictionSort"><option value="high">모델 점수 높은순</option><option value="low">모델 점수 낮은순</option><option value="recent">최근 구매순</option></select></label><label class="search-label">고객 검색<div class="report-search"><input v-model="predictionQuery" placeholder="이름, 이메일 또는 회원 ID"/><button class="button" type="submit">검색</button></div></label></form>
 <div class="report-table-wrap"><table class="report-table"><thead><tr><th>고객</th><th>최근 구매 경과</th><th>구매 횟수</th><th>상품 구매액</th><th>모델 점수</th><th>예측 결과</th></tr></thead><tbody><tr v-for="row in predictionVisible" :key="row.id"><td><strong>{{ row.name }}</strong><small>{{ row.email||`회원 ${row.id}` }}</small></td><td>{{ count(row.recencyDays) }}일</td><td>{{ count(row.purchaseCount) }}회</td><td>{{ amount(row.itemAmount) }}</td><td><span class="score-number">{{ score(row.score) }}</span></td><td><span :class="['prediction-badge',{'is-buy':row.predictedBuy===true,'is-attention':row.attention===true}]">{{ row.predictedBuy===true?'재구매 예상':row.attention===true?'검토 후보':'판단 미제공' }}</span></td></tr><tr v-if="!predictionVisible.length"><td colspan="6" class="empty-cell">조건에 맞는 예측 결과가 없습니다.</td></tr></tbody></table></div>
 <nav class="report-pagination" aria-label="재구매 예측 페이지"><button :disabled="predictionPage===1" @click="predictionPage=1">처음</button><button :disabled="predictionPage===1" @click="predictionPage--">이전</button><strong>{{ predictionPage }} / {{ predictionPages }}</strong><button :disabled="predictionPage===predictionPages" @click="predictionPage++">다음</button><button :disabled="predictionPage===predictionPages" @click="predictionPage=predictionPages">마지막</button></nav>
 </article>
 <article v-if="report.categories.length" class="customer-section category-supplement"><header><div><span class="section-number">CATEGORY INSIGHT</span><h2>카테고리별 구매 고객</h2><p>카테고리 내 중복 고객 제외</p></div></header><CategoryCustomerBreakdown :rows="report.categories" :products="data.products" :category-order="data.categories"/></article>
 </template>
 <details class="customer-section model-details" @toggle="loadTraining"><summary><span>모델 상태 · 학습 준비</span><small>필요할 때 펼쳐보기</small></summary><p class="report-footnote">실제 서버의 학습 준비 상태입니다. 모델 최신화는 화면 오른쪽 위 버튼으로 실행합니다.</p><p v-if="trainingBusy" role="status">모델 상태를 확인하고 있습니다…</p><div v-else-if="trainingError"><p role="alert">{{ trainingError }}</p><button class="button" @click="loadTraining({target:{open:true}})">다시 시도</button></div><template v-else-if="training"><h3>{{ training.eligible?'학습 조건 충족':'학습 데이터 보강 필요' }}</h3><p>고객 {{ count(training.customer_count) }}명 · 학습 사례 {{ count(training.training_case_count) }}건 · {{ count(training.month_count) }}개월</p><ul><li v-for="reason in training.reasons||[]" :key="reason">{{ reason }}</li></ul><p>{{ training.note }}</p></template></details>
 <dialog v-if="selected" ref="customerDialog" class="customer-history-dialog" aria-labelledby="customer-history-title" @cancel.prevent="closeCustomer" @click="e=>{if(e.target===customerDialog)closeCustomer()}"><header><div><span class="section-number">CUSTOMER PURCHASE HISTORY</span><h2 id="customer-history-title">{{ selected.name }}님의 구매 현황</h2><p>{{ selected.email }} · 회원 {{ selected.id }}</p></div><button class="dialog-close" aria-label="고객 구매 현황 닫기" @click="closeCustomer">✕</button></header><p class="report-footnote">{{ report.overviewPeriod }}</p><div class="history-summary"><div><span>구매 횟수</span><strong>{{ selected.purchaseCount===null?'집계 미제공':`${count(selected.purchaseCount)}회` }}</strong></div><div><span>상품 수량</span><strong>{{ selected.itemQuantity===null?'미제공':`${count(selected.itemQuantity)}개` }}</strong></div><div><span>상품 구매액</span><strong>{{ amount(selected.itemAmount) }}</strong></div></div><h3>구매 상품</h3><p v-if="!selected.productsAvailable" class="report-message">상품명·수량은 주문 관리에서 확인할 수 있습니다. 주문 응답에 구매자 식별자가 없어 이 회원과 자동 연결하지 않습니다. <RouterLink class="detail-button" to="/admin/orders">주문 상품 확인</RouterLink></p><ul v-else-if="selected.items.length" class="history-products"><li v-for="item in selected.items" :key="item.id"><img v-if="item.image" :src="item.image" alt=""/><div><strong>{{ item.name }}</strong><span>{{ count(item.quantity) }}개</span></div><b>{{ money(item.amount) }}</b></li></ul><p v-else>정상 구매 내역이 없습니다.</p><footer><button class="button" @click="closeCustomer">닫기</button></footer></dialog>
</section>
</template>
<style scoped>
.report-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}.report-kpis article{min-width:0;padding:22px;background:#fff;border:1px solid #e0e7f0;border-radius:14px}.report-kpis article:first-child{background:#293e62;color:#fff;border-color:#293e62}.report-kpis article>span{display:block;font-size:17px;color:#718097}.report-kpis article:first-child>span{color:#ccd9ef}.report-kpis strong{display:block;font-size:34px;line-height:1.3;letter-spacing:-1px;margin:12px 0 8px;overflow-wrap:anywhere}.report-kpis small{font-size:19px;margin-left:5px}.report-kpis p{font-size:14px;margin:0;color:#718097}.report-kpis article:first-child p{color:#dce5f5}.report-kpis strong.metric-money{font-size:27px}
@media(max-width:1450px){.report-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.report-kpis strong.metric-money{font-size:34px}}
@media(max-width:650px){.report-kpis article{padding:15px}.report-kpis strong,.report-kpis strong.metric-money{font-size:25px}.report-kpis article>span{font-size:15px}}

.customer-report{display:grid;gap:24px;min-width:0;color:#203049;font-size:17px;line-height:1.6;padding-bottom:24px}.report-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px}.report-toolbar p{margin:0;color:#67778e;font-size:15px}.customer-section{min-width:0;padding:26px;background:#fff;border:1px solid #e0e7f0;border-radius:16px;box-shadow:0 3px 18px #263d6410}.customer-section>header,.customer-history-dialog>header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}.section-number{display:block;color:#6376a0;font-size:12px;font-weight:750;letter-spacing:1.5px;margin-bottom:5px}.customer-section h2,.customer-history-dialog h2{font-size:25px;line-height:1.35;margin:0 0 8px;letter-spacing:-.7px}.customer-section header p,.customer-history-dialog header p{margin:0;color:#69788e;font-size:16px}.result-count{font-weight:700;white-space:nowrap}.report-filters{display:grid;grid-template-columns:160px 180px minmax(220px,1fr);gap:14px;margin:18px 0}.report-filters label{display:flex;flex-direction:column;gap:7px;font-size:15px;font-weight:650}.customer-report :is(input,select){width:100%;min-width:0;border:1px solid #d5ddeb;border-radius:8px;background:#fff;padding:11px 12px;font:inherit;color:#25364e;height:46px;box-sizing:border-box}.report-search{display:flex;gap:8px}.report-search input{flex:1}.customer-report button{font:inherit;font-size:16px;white-space:nowrap;cursor:pointer}.report-search button{height:46px;padding:0 20px}.report-table-wrap{overflow-x:auto}.report-table{width:100%;border-collapse:collapse;text-align:left;font-size:17px}.report-table th{color:#63718a;background:#f5f7fb;font-size:15px;font-weight:650;white-space:nowrap}.report-table :is(td,th){padding:16px 12px;border-bottom:1px solid #e8edf5;vertical-align:middle}.report-table td strong{display:block}.report-table td small{display:block;color:#76849a;font-size:13px;margin-top:3px}.report-table tbody tr:hover{background:#f9fbff}.report-table .numeric{font-weight:650;white-space:nowrap}.purchase-summary{display:flex;align-items:center;gap:12px;max-width:290px;font-size:15px}.purchase-summary img{width:48px;height:48px;object-fit:contain;border:1px solid #edf0f5;border-radius:7px;flex:none}.muted,.report-footnote{color:#69798f;font-size:15px;line-height:1.7}.report-footnote{margin:14px 0}.detail-button{padding:8px 12px;border:1px solid #d7e0ef;background:#f7f9fd;color:#355286;border-radius:8px}.report-pagination{display:flex;justify-content:center;align-items:center;gap:10px;padding-top:22px}.report-pagination button{border:1px solid #d9e1ed;background:#fff;color:#354a6d;padding:9px 14px;border-radius:7px}.report-pagination button:disabled{opacity:.4;cursor:default}.report-pagination strong{min-width:68px;text-align:center}.empty-cell{text-align:center;padding:38px!important;color:#77869d}.customer-report-charts{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.3fr);gap:24px;align-items:start}.customer-report-charts .admin-chart{height:330px;position:relative}.customer-report-charts :deep(canvas){position:absolute;inset:0}.customer-report-charts header{align-items:flex-start}.customer-report-charts select{width:140px;font-size:15px;flex:none}.repeat-headline{display:flex;flex-wrap:wrap;align-items:baseline;gap:12px}.repeat-headline strong{font-size:42px;color:#4865d7;line-height:1.3}.repeat-headline span{color:#718097;font-size:15px}.repeat-counts{display:flex;justify-content:center;gap:26px;font-size:16px}.repeat-counts b{margin-left:8px}.monthly-details summary{cursor:pointer;color:#4663ad;font-weight:650;padding:9px 0}.score-number{font-weight:750;color:#4865d7;font-size:20px;white-space:nowrap}.forecast-label{border-radius:8px;background:#eef2ff;color:#4d65bd;padding:8px 12px;font-size:14px;white-space:nowrap}.forecast-label.demo{background:#fff4dd;color:#8c671d}.prediction-badge{display:inline-block;padding:6px 12px;border-radius:20px;font-size:15px;font-weight:650;background:#f0f3f8;white-space:nowrap}.prediction-badge.is-buy{background:#e4f5ed;color:#18785b}.prediction-badge.is-attention{background:#fff0dd;color:#9b661a}.report-message{background:#f1f5ff;color:#3e5a8d;padding:14px 18px;border:1px solid #dbe5f8;border-radius:9px;margin:0}.model-details>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;font-weight:700;font-size:20px}.model-details>summary:after{content:'＋';font-weight:500}.model-details[open]>summary:after{content:'−'}.model-details summary small{font-size:14px;color:#8490a3;margin-left:auto}.model-details li{margin:8px 0}.customer-history-dialog{width:min(850px,calc(100vw - 40px));max-height:85dvh;padding:28px;border:1px solid #e0e7f0;border-radius:16px;color:#203049;font-size:17px;box-sizing:border-box;overflow:auto}.customer-history-dialog::backdrop{background:#15253e70;backdrop-filter:blur(3px)}.dialog-close{border:0;background:#f0f3f8;border-radius:50%;width:38px;height:38px}.history-summary{display:grid;grid-template-columns:1fr 1fr 1.4fr;background:#f5f7fc;padding:20px;gap:18px;border-radius:10px;margin:20px 0}.history-summary span{display:block;color:#758198;font-size:14px}.history-summary strong{display:block;font-size:24px;margin-top:7px}.history-products{list-style:none;padding:0}.history-products li{display:flex;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid #e6ebf3}.history-products img{width:75px;height:75px;object-fit:contain}.history-products li div{flex:1}.history-products span{display:block;color:#76849b;margin-top:6px}.customer-history-dialog footer{display:flex;justify-content:flex-end;margin-top:24px}.customer-section.reveal-pending{opacity:0;transform:translateY(18px);transition:opacity .5s ease,transform .5s ease}.customer-section.is-visible{opacity:1;transform:none}
@media(max-width:1400px){.customer-report-charts{grid-template-columns:minmax(0,1fr)}.customer-report-charts .admin-chart{height:370px}.customer-report-charts .customer-section>header{align-items:center}}
@media(max-width:800px){.customer-section{padding:18px}.report-filters{grid-template-columns:1fr 1fr}.search-label{grid-column:1/-1}.customer-section h2{font-size:23px}.history-summary{grid-template-columns:1fr}.customer-report-charts .admin-chart{height:310px}.report-table{min-width:760px}.customer-section header{flex-wrap:wrap}.report-pagination{gap:6px}.report-pagination button{padding:8px 10px}}
@media(prefers-reduced-motion:reduce){.customer-section.reveal-pending{opacity:1;transform:none;transition:none}}
</style>
