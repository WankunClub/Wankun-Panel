// ── STOCK ─────────────────────────────────────────────────────────────────────
const SK_PRODUCTS=[{"nombre":"PRO PLAN KITTEN PROTECTION","sku":"PPCATKITT1","kg":1,"costo":14316.82},{"nombre":"PRO PLAN KITTEN PROTECTION","sku":"PPCATKITT3","kg":3,"costo":38740.38},{"nombre":"PRO PLAN GATO ADULTO","sku":"PPCATADU3","kg":3,"costo":35177.1},{"nombre":"PRO PLAN GATO ADULTO","sku":"PPCATADU75","kg":7.5,"costo":76641.88},{"nombre":"PRO PLAN ADULT CAT 7+","sku":"PPCATADU+775","kg":7.5,"costo":82941.11},{"nombre":"PRO PLAN URINARY CAT","sku":"PPCATURI75","kg":7.5,"costo":83898.78},{"nombre":"PRO PLAN STERILIZED CAT","sku":"PPCATSTER3","kg":3,"costo":88232.34},{"nombre":"EXCELLENT GATO KITTEN","sku":"EXCCATKITT75","kg":7.5,"costo":53720.66},{"nombre":"EXCELLENT GATO ADULTO","sku":"EXCCATADU3","kg":3,"costo":22540.0},{"nombre":"EXCELLENT GATO ADULTO","sku":"EXCCATADU75","kg":7.5,"costo":48510.0},{"nombre":"EXCELLENT GATO ADULTO","sku":"EXCCATADU15","kg":15,"costo":93688.0},{"nombre":"EXCELLENT GATO STERELIZED","sku":"EXCECATSTERE7","kg":7.5,"costo":55958.0},{"nombre":"EXCELLENT URINARY CAT","sku":"EXCCATURINARY7","kg":7.5,"costo":55958.0},{"nombre":"FAWNA ADULT CAT","sku":"FWCATADU75","kg":7.5,"costo":39497.44},{"nombre":"FAWNA URINARY CAT","sku":"FWCATURI75","kg":7.5,"costo":45092.4},{"nombre":"FAWNA ADULT CAT STERILIZED","sku":"FWCATADUSTE75","kg":7.5,"costo":43467.05},{"nombre":"OLD PRINCE EQUILIBRIUM CATS COMPLETE CARE","sku":"OPCATEQCC75","kg":7.5,"costo":32865.07},{"nombre":"OLD PRINCE EQUILIBRIUM CATS INDOOR CARE","sku":"OPCATEQIND75","kg":7.5,"costo":36151.57},{"nombre":"OLD PRINCE EQUILIBRIUM CATS URINARY CARE","sku":"OPCATEQURI75","kg":7.5,"costo":37711.29},{"nombre":"OLD PRINCE GATO ADULTO CORDERO","sku":"OPCATADUCOR75","kg":7.5,"costo":37432.34},{"nombre":"OLD PRINCE NOVEL GATOS ADULTOS","sku":"OPCATADUNOV75","kg":7.5,"costo":42448.28},{"nombre":"OLD PRINCE NOVEL ADULT CAT STERILIZED","sku":"OPCATADUNOVSTE75","kg":7.5,"costo":47895.95},{"nombre":"EUKANUBA ADULTO TOP CONDITION","sku":"EUKACATADU3","kg":3,"costo":24330.24},{"nombre":"EUKANUBA ADULTO TOP CONDITION","sku":"EUKACATADU7","kg":7.5,"costo":56082.51},{"nombre":"OPTIMUS GATO","sku":"OSCATADU75","kg":7.5,"costo":26666.67},{"nombre":"UNIK KITTEN","sku":"UKKITTEN","kg":2,"costo":26666.67},{"nombre":"UNIK GATO CASTRADO","sku":"UKCATCAS2","kg":2,"costo":12750.0},{"nombre":"UNIK GATO CASTRADO","sku":"UKCATCAS7","kg":7,"costo":39400.0},{"nombre":"PERSIAN","sku":"RCCATPER1","kg":1.5,"costo":26771.67},{"nombre":"PERSIAN","sku":"RCCATPER7","kg":7.5,"costo":97964.62},{"nombre":"SIAMESE","sku":"RCCATSIAM7","kg":7.5,"costo":97964.62},{"nombre":"URINARY CARE","sku":"RCCATURIC1","kg":1.5,"costo":26113.55},{"nombre":"URINARY CARE","sku":"RCCATURIC7","kg":7.5,"costo":108087.67},{"nombre":"FIT","sku":"RCCATFIT1","kg":1.5,"costo":22363.31},{"nombre":"FIT","sku":"RCCATFIT3","kg":3,"costo":38648.03},{"nombre":"FIT","sku":"RCCATFIT7","kg":7.5,"costo":93826.57},{"nombre":"FIT","sku":"RCCATFIT15","kg":15,"costo":158470.3},{"nombre":"INDOOR","sku":"RCCATIND1","kg":1.5,"costo":23921.31},{"nombre":"INDOOR","sku":"RCCATIND7","kg":7.5,"costo":93826.57},{"nombre":"INDOOR 7+","sku":"RCCATIND71","kg":1.5,"costo":25127.43},{"nombre":"INDOOR 7+","sku":"RCCATIND77","kg":7.5,"costo":98557.32},{"nombre":"KITTEN","sku":"RCCATKITT1","kg":1.5,"costo":25533.12},{"nombre":"KITTEN","sku":"RCCATKITT7","kg":7.5,"costo":93777.21},{"nombre":"SENSIBLE","sku":"RCCATSEN1","kg":1.5,"costo":23928.72},{"nombre":"SENSIBLE","sku":"RCCATSEN7","kg":7.5,"costo":93828.23},{"nombre":"GASTRO INTESTINAL FELINO","sku":"RCCATGAS2","kg":2,"costo":33287.04},{"nombre":"RENAL FELINE","sku":"RCCATREN2","kg":2,"costo":30449.7},{"nombre":"URINARY S/O HIGH DILUTION","sku":"RCCATURISO1","kg":1.5,"costo":26769.62},{"nombre":"URINARY S/O HIGH DILUTION","sku":"RCCATURISO7","kg":7.5,"costo":98856.02},{"nombre":"CLUB PERFORMANCE CAT ADULTO","sku":"CPCATADU7","kg":7.5,"costo":55966.08},{"nombre":"CLUB PERFORMANCE KITTEN","sku":"CPCATKITT7","kg":7.5,"costo":59637.3},{"nombre":"GATO CASTRADO WEIGHT CONTROL","sku":"RCCATCASWC1","kg":1.5,"costo":23727.43},{"nombre":"GATO CASTRADO WEIGHT CONTROL","sku":"RCCATCASWC3","kg":3,"costo":46474.4},{"nombre":"GATO CASTRADO WEIGHT CONTROL","sku":"RCCATCASWC7","kg":7.5,"costo":93765.67},{"nombre":"GATO CASTRADO WEIGHT CONTROL","sku":"RCCATCASWC12","kg":12,"costo":135928.43},{"nombre":"OPTIMUS PERRO ADULTO","sku":"OPTDOGADUL20","kg":20,"costo":42305.0},{"nombre":"OPTIMUS CACHORRO","sku":"OPTDOGCACH15","kg":15,"costo":29662.78},{"nombre":"UNIK PERRO CACHORRO PEQUE\u00d1O","sku":"UKDOGCACHSMALL3","kg":3,"costo":13500.0},{"nombre":"UNIK PERRO CACHORRO MEDIANO Y GRANDE","sku":"UKDOGCACHMED15","kg":15,"costo":50250.0},{"nombre":"UNIK PERRO ADULTO PEQUE\u00d1O CASTRADO","sku":"UKDIGADUPEQCAS76","kg":7.5,"costo":31000.0},{"nombre":"UNIK PERRO ADULTO MEDIANO CASTRADO","sku":"UKDOGCAS15","kg":15,"costo":50290.0},{"nombre":"UNIK PERRO ADULTO PEQUE\u00d1O","sku":"UKDGOSMALL7","kg":7.5,"costo":29000.0},{"nombre":"UNIK PERRO MEDIANO Y GRANDE","sku":"UKDOGMED15","kg":15,"costo":45475.0},{"nombre":"FAWNA CACHORRO MEDIANO Y GRANDE","sku":"FWDOGCACHMED15","kg":15,"costo":68576.55},{"nombre":"FAWNA ADULTO MEDIANO Y GRANDE","sku":"FWDOGADUMED15","kg":15,"costo":66121.72},{"nombre":"FAWNA PERRO ADULTO LIGHT","sku":"FWDOGADULIGHT15","kg":15,"costo":64588.78},{"nombre":"FAWNA PERRO ADULTO SENIOR","sku":"FWDOGSENIOR15","kg":15,"costo":64588.78},{"nombre":"PRO PLAN PUPPY SMALL BREED","sku":"PRODOGPUPPYSM3","kg":3,"costo":30380.0},{"nombre":"PRO PLAN PUPPY SMALL BREED","sku":"PRODOGPUPPYSM7","kg":7.5,"costo":63014.0},{"nombre":"PRO PLAN PUPPY MEDIUM BREED","sku":"PRODOGPUPPYMED15","kg":15,"costo":99176.0},{"nombre":"PRO PLAN PUPPY LARGE BREED","sku":"PRODOGPUPPYLARGE15","kg":15,"costo":99176.0},{"nombre":"PRO PLAN ADULTO SMALL BREED","sku":"PRODOGADUSMALL7","kg":7.5,"costo":57036.0},{"nombre":"PRO PLAN ADULTO MEDIUM BREED","sku":"PRODOGADUMED3","kg":3,"costo":26068.0},{"nombre":"PRO PLAN ADULTO MEDIUM BREED","sku":"PRODOGADUMED15","kg":15,"costo":90160.0},{"nombre":"PRO PLAN ADULTO LARGE","sku":"PRODOGADULARGE15","kg":15,"costo":90160.0},{"nombre":"PRO PLAN REDUCED CALORIES","sku":"PRODOGRC12","kg":12,"costo":83202.0},{"nombre":"OLD PRINCE NOVEL CACHORRO ALL BREEDS","sku":"OPDOGCACHNOVEL15","kg":15,"costo":57488.76},{"nombre":"OLD PRINCE EQUILIBRIUM ADULTO WEIGHT CONTROL","sku":"OPDOGADUEQWC15","kg":15,"costo":44864.21},{"nombre":"OLD PRINCE NOVEL ADULTO SMALL BREED","sku":"OPDOGADUSMALLNOV15","kg":15,"costo":57488.76},{"nombre":"OLD PRINCE NOVEL ADULTO MEDIANO Y GRANDE","sku":"OPDOGADUMEDNOV15","kg":15,"costo":50637.31},{"nombre":"OLD PRINCE NOVEL CORDERO SENIOR","sku":"OPDOGSENNOV15","kg":15,"costo":54875.62},{"nombre":"OLD PRINCE SPECIAL RECIPE WEIGHT CONTROL","sku":"OPDOGSRWC15","kg":15,"costo":44864.21},{"nombre":"OLD PRINCE NOVEL LIGHT","sku":"OPDOGLIGHTNOV15","kg":15,"costo":54875.62},{"nombre":"MAXI WEIGHT CARE","sku":"RCDOGMAXWC10","kg":10,"costo":84689.05},{"nombre":"MEDIUM WEIGHT CARE","sku":"RCDOGMEDWC3","kg":3,"costo":33349.06},{"nombre":"MEDIUM WEIGHT CARE","sku":"RCDOGMEDWC10","kg":10,"costo":84689.05},{"nombre":"MINI WEIGHT CARE","sku":"RCDOGMINIWC3","kg":3,"costo":34196.92},{"nombre":"MINI DERMACOMFORT","sku":"RCDOGMINIDERMA3","kg":3,"costo":32078.34},{"nombre":"MEDIUM DERMACONFORT","sku":"RCDOGMEDDERMA3","kg":3,"costo":31283.01},{"nombre":"MEDIUM DERMACONFORT","sku":"RCDOGMEDDERMA10","kg":10,"costo":77172.58},{"nombre":"MAXI DERMACOMFORT","sku":"RCDOGMAXIDERMA10","kg":10,"costo":77172.58},{"nombre":"HYPOALLERGENIC CANINE PUPPY","sku":"RCDOGHYPOPUPPY2","kg":2,"costo":28575.07},{"nombre":"HYPOALLERGENIC CANINE PUPPY","sku":"RCDOGHYPOPUPPY10","kg":10,"costo":104609.59},{"nombre":"ANALLERGENIC CANINE","sku":"RCDOGANAL8","kg":8,"costo":112837.88},{"nombre":"CARDIAC CANINE","sku":"RCDOGCARDIAC10","kg":10,"costo":102893.68},{"nombre":"DIABETIC CANINE","sku":"RCDOGDIABETIC2","kg":2,"costo":26313.4},{"nombre":"DIABETIC CANINE","sku":"RCDOGDIABETIC10","kg":10,"costo":102571.07},{"nombre":"GASTRO INTESTINAL MC","sku":"RCDOGGASTROMC10","kg":10,"costo":93043.84},{"nombre":"GASTRO INTESTINAL","sku":"RCDOGGASTRO2","kg":2,"costo":22495.45},{"nombre":"GASTRO INTESTINAL","sku":"RCDOGGASTRO10","kg":10,"costo":87936.47},{"nombre":"HEPATIC CANINE","sku":"RCDOGHEPATIC1","kg":1.5,"costo":18330.28},{"nombre":"HEPATIC CANINE","sku":"RCDOGHEPATIC10","kg":10,"costo":98844.26},{"nombre":"HYPOALLERGENIC CANINE","sku":"RCDOGHYPO2","kg":2,"costo":27606.48},{"nombre":"HYPOALLERGENIC CANINE","sku":"RCDOGHYPO110","kg":10,"costo":104609.59},{"nombre":"MOBILITY CANINE","sku":"RCDOGMOBILITY10","kg":10,"costo":104842.77},{"nombre":"MOBILITY LARGER DOG","sku":"RCDOGMOBILITYLD15","kg":15,"costo":137450.27},{"nombre":"RENAL CANINE","sku":"RCDOGRENAL1","kg":1.5,"costo":16727.94},{"nombre":"RENAL CANINE","sku":"RCDOGRENAL10","kg":10,"costo":90312.52},{"nombre":"SATIETY CANINE","sku":"RCDOGSATIETY7","kg":7.5,"costo":69303.47},{"nombre":"SATIETY CANINE","sku":"RCDOGSATIETY15","kg":15,"costo":123678.53},{"nombre":"URINARY AGEING 7+","sku":"RCDOGURI710","kg":10,"costo":97678.59},{"nombre":"URINARY CARE S/O","sku":"RCDOGURISO7","kg":10,"costo":97678.59},{"nombre":"CLUB PERFORMANCE JUNIOR","sku":"CPDOGJUN15","kg":15,"costo":71991.5},{"nombre":"CLUB PERFORMANCE DOG ADULTO","sku":"CPDOGADU15","kg":15,"costo":66697.49},{"nombre":"CLUB PERFORMANCE DOG ADULTO","sku":"CPDOGADU20","kg":20,"costo":85380.99},{"nombre":"CLUB PERFORMANCE WEIGHT CONTROL","sku":"CPDOGWC15","kg":15,"costo":66697.49},{"nombre":"BOXER ADULTO","sku":"RCDOGADUBOXER12","kg":12,"costo":92580.33},{"nombre":"BULLDOG FRANCES ADULTO","sku":"RCDOGADUBULL7","kg":7.5,"costo":70477.08},{"nombre":"CANICHE ADULTO","sku":"RCDOGADUCANICHE3","kg":3,"costo":33010.82},{"nombre":"CANICHE ADULTO","sku":"RCDOGADUCANICHE7","kg":7.5,"costo":70480.53},{"nombre":"DACHSHUND ADULTO","sku":"RCDOGADUDASCH3","kg":3,"costo":33010.82},{"nombre":"GOLDEN RETRIEVER ADULTO","sku":"RCDOGADUGOLDEN12","kg":12,"costo":92580.33},{"nombre":"JACK RUSELL ADULTO","sku":"RCDOGADUJACK3","kg":3,"costo":33010.82},{"nombre":"LABRADOR RETRIEVER ADULTO","sku":"RCDOGADULABRADOR12","kg":12,"costo":92580.33},{"nombre":"OVEJERO ALEMAN CACHORRO","sku":"RCDOGADUOVEJEROpuppy12","kg":12,"costo":102241.63},{"nombre":"OVEJERO ALEMAN ADULTO","sku":"RCDOGADUOVEJERO12","kg":12,"costo":92580.33},{"nombre":"PUG ADULTO","sku":"RCDOGADUPUG7","kg":7.5,"costo":70477.08},{"nombre":"GIANT PUPPY","sku":"RCDOGPUPYGIANT15","kg":15,"costo":116717.74},{"nombre":"MAXI PUPPY","sku":"RCDOGMAXIPUPY3","kg":3,"costo":32125.31},{"nombre":"MAXI PUPPY","sku":"RCDOGMAXIPUPY15","kg":15,"costo":116717.74},{"nombre":"MEDIUM PUPPY","sku":"RCDOGMEDPUPY3","kg":3,"costo":32125.31},{"nombre":"MEDIUM PUPPY","sku":"RCDOGMEDPUPY15","kg":15,"costo":116717.74},{"nombre":"MINI PUPPY","sku":"RCDOGMINIPUPY3","kg":3,"costo":31666.37},{"nombre":"GIANT JUNIOR","sku":"RCDOGGIANTJUN15","kg":15,"costo":116717.74},{"nombre":"GIANT ADULT","sku":"RCDOGGIANTADU15","kg":15,"costo":104125.06},{"nombre":"MAXI ADULT","sku":"RCDOGMAXIADU15","kg":15,"costo":109331.31},{"nombre":"MAXI ADULT 5+","sku":"RCDOGMAXIADU515","kg":15,"costo":120239.83},{"nombre":"MAXI AGEING+8","sku":"RCDOGMAXAGEING815","kg":15,"costo":120239.83},{"nombre":"MEDIUM ADULT","sku":"RCDOGMEDADU3","kg":3,"costo":28823.28},{"nombre":"MEDIUM ADULT","sku":"RCDOGMEDADU7","kg":7.5,"costo":66873.06},{"nombre":"MEDIUM ADULT","sku":"RCDOGMEDADU15","kg":15,"costo":109790.69},{"nombre":"MEDIUM ADULT +7","sku":"RCDOGMEDADU73","kg":3,"costo":31578.05},{"nombre":"MEDIUM ADULT +7","sku":"RCDOGMEDADU715","kg":15,"costo":120745.07},{"nombre":"MEDIUM ADULT+10","sku":"RCDOGMEDADU1016","kg":15,"costo":120745.07},{"nombre":"MINI ADULT","sku":"RCDOGMINIADU3","kg":3,"costo":30347.76},{"nombre":"MINI ADULT","sku":"RCDOGMINIADU7","kg":7.5,"costo":70399.23},{"nombre":"MINI ADULT","sku":"RCDOGMINIADU15","kg":15,"costo":115579.88},{"nombre":"MINI AGEING +12","sku":"RCDOGMINIADU123","kg":3,"costo":32373.8},{"nombre":"MINI ADULT +8","sku":"RCDOGMINIADU83","kg":3,"costo":32373.8},{"nombre":"EXCELLENT PUPPY SMALL BREED","sku":"EXDOGPUPYSMALL7","kg":7.5,"costo":33712.35},{"nombre":"EXCELLENT PUPPY MEDIANO Y GRANDE","sku":"EXDOGPUPYMED15","kg":15,"costo":60573.0},{"nombre":"EXCELLENT PERRO ADULTO SMALL","sku":"EXDOGADUSMALL3","kg":3,"costo":14597.1},{"nombre":"EXCELLENT PERRO ADULTO SMALL","sku":"EXDOGADUSMALL7","kg":7.5,"costo":31776.0},{"nombre":"EXCELLENT PERRO ADULTO SMALL","sku":"EXDOGADUSMALL15","kg":15,"costo":57594.0},{"nombre":"EXCELLENT PERRO ADULTO MEDIANO","sku":"EXDOGADUMED3","kg":3,"costo":14597.1},{"nombre":"EXCELLENT PERRO ADULTO MEDIANO","sku":"EXDOGADUMED15","kg":15,"costo":55608.0},{"nombre":"EXCELLENT PERRO SENIOR","sku":"EXDOGSEN15","kg":15,"costo":60573.0},{"nombre":"EXCELLENT ADULT SKIN CARE CORDERO","sku":"EXDOGSKIN15","kg":15,"costo":59580.0},{"nombre":"EXCELLENT PERRO ADULTO REDUCED CALORIES","sku":"EXDOGADURC15","kg":15,"costo":63552.0},{"nombre":"EUKANUBA PUPPY LAMB","sku":"EKDOGPUPYLAMB3","kg":3,"costo":18364.95},{"nombre":"EUKANUBA PUPPY LAMB","sku":"EKDOGPUPYLAMB15","kg":15,"costo":66710.27},{"nombre":"EUKANUBA PUPPY SMALL BREED","sku":"EKDOGPUPSMALL3","kg":3,"costo":19231.66},{"nombre":"EUKANUBA PUPPY MEDIUM","sku":"EKDOGPUPMED3","kg":3,"costo":18915.92},{"nombre":"EUKANUBA PUPPY MEDIUM","sku":"EKDOGPUPYMED15","kg":15,"costo":70045.77},{"nombre":"EUKANUBA PUPPY LARGE BREED","sku":"EKDOGPUPYLARGE3","kg":3,"costo":18915.89},{"nombre":"EUKANUBA PUPPY LARGE BREED","sku":"EKDOGPUPYLARGE15","kg":15,"costo":70045.77},{"nombre":"EUKANUBA ADULT SMALL BREED","sku":"EKDOGADUSMALL3","kg":3,"costo":18584.65},{"nombre":"EUKANUBA ADULT MEDIUM BREED","sku":"EKDOGADUMED3","kg":3,"costo":18202.76},{"nombre":"EUKANUBA ADULT MEDIUM BREED","sku":"EKDOGADUMED15","kg":15,"costo":69750.0},{"nombre":"EUKANUBA ADULTO LARGE BREED","sku":"EKDOGADULARG15","kg":15,"costo":69458.16},{"nombre":"EUKANUBA ADULTO LAMB","sku":"EKDOGADULAMB15","kg":15,"costo":66428.57},{"nombre":"EUKANUBA SENIOR SMALL BREED","sku":"EKDOGSENSMALL3","kg":3,"costo":19857.92},{"nombre":"EUKANUBA SENIOR MEDIUM BREED","sku":"EKDOGSENMED3","kg":3,"costo":19411.0},{"nombre":"EUKANUBA SENIOR MEDIUM BREED","sku":"EKDOGSENMED15","kg":15,"costo":73259.3},{"nombre":"EUKANUBA SENIOR LARGE BREED","sku":"EKDOGSENLARGE15","kg":15,"costo":72962.61},{"nombre":"EUKANUBA FIT BODY MEDIUM BREED","sku":"EKDOGFITMED3","kg":3,"costo":20081.34},{"nombre":"EUKANUBA FIT BODY MEDIUM BREED","sku":"EKDOGFBMED15","kg":15,"costo":77559.52},{"nombre":"EUKANUBA FIT BODY LARGE BREED","sku":"EKDOGFBLARGE15","kg":15,"costo":78265.65},{"nombre":"BALANCED PERRO ADULTO RAZA GRANDE","sku":"BALDOGRG20","kg":20,"costo":50642.0},{"nombre":"BALANCED PERRO ADULTO RAZA MEDIANA","sku":"BALDOGMED20","kg":20,"costo":50642.0},{"nombre":"BALANCED PERRO SENIOR RAZA PEQUE\u00d1A","sku":"BALDOGSENIORRP75","kg":7.5,"costo":25510.0},{"nombre":"MON AMI CORDERO","sku":"MONDOGCOR12","kg":12,"costo":56141.87},{"nombre":"MON AMI CORDERO","sku":"MONDOGCOR7","kg":7.5,"costo":40351.73},{"nombre":"MON AMI POLLO","sku":"MONDOGPOLLO12","kg":12,"costo":50527.94},{"nombre":"MON AMI RAZAS PEQUE\u00d1AS Y MEDIANAS","sku":"MONDOGPYM6","kg":6,"costo":53900.06},{"nombre":"MON AMI SUPERFOOD MYG","sku":"MONSUPERMYG5","kg":5,"costo":48019.37},{"nombre":"MON AMI SUPERFOOD MYG","sku":"MONSUPERMYG12","kg":12,"costo":94511.7},{"nombre":"NUTRIQUE LARGE PUPPY","sku":"NURDOGLARGEPUPPY15","kg":15,"costo":88645.0},{"nombre":"NUTRIQUE LARGE YOUNG ADULT DOG","sku":"nutdoglargeY15","kg":15,"costo":78146.0},{"nombre":"NUTRIQUE MEDIUM YOUNG ADULT DOG","sku":"nutdogmedyoung12","kg":12,"costo":64461.76},{"nombre":"NUTRIQUE MEDIUM PUPPY","sku":"nutdogmedpuppy12","kg":12,"costo":67245.0},{"nombre":"NUTRIQUE TOY MINI YOUNG ADULT DOG","sku":"NUTDOGTOYADU75","kg":7.5,"costo":0},{"nombre":"NUTRIQUE MEDIUM ADULT +7","sku":"NUTDOGMEDADU+712","kg":12,"costo":70297.0},{"nombre":"NUTRIQUE LARGE YOUNG ADULT DOG +6","sku":"NUTDOGLAR+615","kg":15,"costo":84069.84},{"nombre":"BALANCED MEDIUM ADULT","sku":"BALDOGMEDADU20","kg":20,"costo":53310.82},{"nombre":"BALANCED LARGE ADULT","sku":"BALDOGLARADU20","kg":20,"costo":53310.82},{"nombre":"PROF VET NUTRICION","sku":"PROFDOGNUTRI20","kg":20,"costo":32976.0},{"nombre":"PROF VET PREMIUM","sku":"PROFDOGPRE20","kg":20,"costo":41135.0},{"nombre":"PROF VET CORDERO","sku":"PROFVETCOR15","kg":15,"costo":43195.0}];

var skSel={ing:null,vta:null,aj:null};
var skMovs=[];

function skLoad(){try{var r=localStorage.getItem('wankun_stock');if(r)skMovs=JSON.parse(r);}catch(e){skMovs=[];}
  var hoy=new Date().toISOString().slice(0,10);
  var di=document.getElementById('sk-ing-d'),dv=document.getElementById('sk-vta-d');
  if(di)di.value=hoy;if(dv)dv.value=hoy;
  var wd=document.getElementById('sk-wc-desde'),wh=document.getElementById('sk-wc-hasta');
  if(wd)wd.value=hoy;if(wh)wh.value=hoy;
}

function skSave(){try{localStorage.setItem('wankun_stock',JSON.stringify(skMovs));}catch(e){}}

function skAc(pfx){
  var q=(document.getElementById('sk-'+pfx+'-q')||{}).value;
  var dd=document.getElementById('sk-'+pfx+'-dd');
  if(!q||q.length<2){dd.style.display='none';return;}
  var ql=q.toLowerCase();
  var hits=SK_PRODUCTS.filter(function(p){return p.nombre.toLowerCase().indexOf(ql)>=0||p.sku.toLowerCase().indexOf(ql)>=0;}).slice(0,10);
  if(!hits.length){dd.style.display='none';return;}
  dd.innerHTML=hits.map(function(p){return'<div onclick="skPick(\''+pfx+'\',\''+p.sku+'\')" style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px" onmouseover="this.style.background=\'#f8f8f8\'" onmouseout="this.style.background=\'\'">'+'<span style="font-weight:500">'+p.nombre+'</span> <span style="color:#aaa">'+p.kg+'kg</span><div style="font-size:11px;color:#aaa;font-family:monospace;margin-top:2px">'+p.sku+'</div></div>';}).join('');
  dd.style.display='block';
}

function skPick(pfx,sku){
  var p=SK_PRODUCTS.filter(function(x){return x.sku===sku;})[0];if(!p)return;
  skSel[pfx]=p;
  document.getElementById('sk-'+pfx+'-q').value=p.nombre+' '+p.kg+'kg';
  document.getElementById('sk-'+pfx+'-dd').style.display='none';
  document.getElementById('sk-'+pfx+'-tag').innerHTML='<span style="background:#dbeafe;color:#1d4ed8;font-family:monospace;font-size:11px;padding:2px 8px;border-radius:4px">'+p.sku+'</span>';
}

function skReg(pfx){
  var p=skSel[pfx];if(!p){alert('Seleccioná un producto');return;}
  var n=parseInt((document.getElementById('sk-'+pfx+'-n')||{}).value||'0');
  if(n<1){alert('Ingresá una cantidad');return;}
  var d=(document.getElementById('sk-'+pfx+'-d')||{}).value||new Date().toISOString().slice(0,10);
  var canal=pfx==='ing'?'ing':'meli';
  skMovs.push({type:canal==='ing'?'ing':'vta',canal:canal,sku:p.sku,nombre:p.nombre,kg:p.kg,qty:n,date:d,ts:Date.now()});
  skSave();
  document.getElementById('sk-'+pfx+'-q').value='';
  document.getElementById('sk-'+pfx+'-tag').innerHTML='';
  document.getElementById('sk-'+pfx+'-n').value='';
  skSel[pfx]=null;
  skRenderTabla();
  skRenderMetricas();
}

function skCalc(){
  var map={};
  SK_PRODUCTS.forEach(function(p){if(!map[p.sku])map[p.sku]={sku:p.sku,nombre:p.nombre,kg:p.kg,i:0,wc:0,ml:0};});
  skMovs.forEach(function(mv){
    if(!map[mv.sku])map[mv.sku]={sku:mv.sku,nombre:mv.nombre,kg:mv.kg,i:0,wc:0,ml:0};
    if(mv.type==='ing')map[mv.sku].i+=mv.qty;
    else if(mv.canal==='wc')map[mv.sku].wc+=mv.qty;
    else if(mv.canal==='meli')map[mv.sku].ml+=mv.qty;
  });
  return Object.values(map);
}

function skRenderMetricas(){
  var rows=skCalc();
  var con=rows.filter(function(r){return r.i-r.wc-r.ml>0;}).length;
  var sin=rows.filter(function(r){return r.i-r.wc-r.ml<=0&&r.i>0;}).length;
  var hoy=new Date().toISOString().slice(0,10);
  var movHoy=skMovs.filter(function(m){return m.date===hoy;}).length;
  var e1=document.getElementById('sk-m-con'),e2=document.getElementById('sk-m-sin'),e3=document.getElementById('sk-m-hoy');
  if(e1)e1.textContent=con;if(e2)e2.textContent=sin;if(e3)e3.textContent=movHoy;
}

function skRenderTabla(){
  var rows=skCalc();
  var q=((document.getElementById('sk-filtro')||{}).value||'').toLowerCase();
  var estado=((document.getElementById('sk-estado')||{}).value)||'';
  var filtered=rows.filter(function(r){
    var a=r.i-r.wc-r.ml;
    if(q&&r.nombre.toLowerCase().indexOf(q)<0&&r.sku.toLowerCase().indexOf(q)<0)return false;
    if(estado==='1'&&a<=0)return false;
    if(estado==='0'&&(a>0||r.i===0))return false;
    return true;
  });
  var tb=document.getElementById('sk-tabla');if(!tb)return;
  if(!filtered.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin resultados</div>';return;}
  tb.innerHTML=filtered.map(function(r){
    var a=r.i-r.wc-r.ml;
    var color=a>2?'var(--verde)':a>0?'#d97706':r.i>0?'#c0392b':'var(--gris-dark)';
    var disp=r.i>0?('<span style="font-weight:600;color:'+color+'">'+a+'</span>'):'<span style="color:var(--gris-dark)">—</span>';
    return'<div class="table-row" style="grid-template-columns:2fr 1fr 60px 80px 80px 80px 80px"><span style="font-size:12px" title="'+r.nombre+'">'+r.nombre+'</span><span style="font-family:monospace;font-size:11px;color:var(--gris-dark)">'+r.sku+'</span><span style="font-size:12px">'+r.kg+'</span><span style="font-size:12px;text-align:center">'+(r.i||'—')+'</span><span style="font-size:12px;text-align:center">'+(r.wc||'—')+'</span><span style="font-size:12px;text-align:center">'+(r.ml||'—')+'</span><span style="text-align:center">'+disp+'</span></div>';
  }).join('');

  // Recientes
  var rec=[].concat(skMovs).sort(function(a,b){return b.ts-a.ts;}).slice(0,5);
  var rdiv=document.getElementById('sk-recientes');if(!rdiv)return;
  if(!rec.length){rdiv.innerHTML='';return;}
  rdiv.innerHTML='<p style="font-size:11px;color:var(--gris-dark);margin-bottom:6px">Últimos movimientos</p>'+rec.map(function(m){
    var s=m.type==='ing'?'color:var(--verde)':'color:#c0392b';
    var lbl=m.type==='ing'?'+'+m.qty:'-'+m.qty;
    var ch=m.type==='ing'?'Ingreso':m.canal==='wc'?'WC':'Meli';
    return'<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--gris-med);font-size:12px"><span>'+m.nombre+' <span style="color:var(--gris-dark);font-size:11px">'+m.kg+'kg</span></span><span><span style="font-weight:600;'+s+'">'+lbl+'</span> <span style="font-size:11px;color:var(--gris-dark)">'+ch+' · '+m.date+'</span></span></div>';
  }).join('');

  skRenderMetricas();
}


function skSincWC(){
  var desde=document.getElementById('sk-wc-desde').value;
  var hasta=document.getElementById('sk-wc-hasta').value;
  var st=document.getElementById('sk-wc-status');
  st.textContent='Cargando ventas...';st.style.color='var(--azul-med)';
  fetchCSV('Ventas').then(function(rows){
    // Eliminar ventas WC previas del rango para no duplicar
    if(desde||hasta){
      skMovs=skMovs.filter(function(m){
        if(m.canal!=='wc')return true;
        if(desde&&m.date<desde)return true;
        if(hasta&&m.date>hasta)return true;
        return false;
      });
    } else {
      skMovs=skMovs.filter(function(m){return m.canal!=='wc';});
    }
    var matched=0,noMatch=[];
    rows.forEach(function(r){
      var fecha=r['FECHA']||r['Fecha']||'';
      var fParsed=parseFecha(fecha);
      if(!fParsed)return;
      var fStr=fParsed.getFullYear()+'-'+String(fParsed.getMonth()+1).padStart(2,'0')+'-'+String(fParsed.getDate()).padStart(2,'0');
      if(desde&&fStr<desde)return;
      if(hasta&&fStr>hasta)return;
      var marca=(r['Marca']||r['marca']||'').trim().toLowerCase();
      var prod=(r['producto']||r['Producto']||'').trim().toLowerCase();
      var kg=parseFloat((r['kg']||'0').toString().replace(',','.'))||0;
      if(!prod&&!marca)return;
      // Buscar match en SKU_PRODUCTS por kg + palabras clave del producto
      var res=skMatchProduct(marca,prod,kg);
      if(res){
        skMovs.push({type:'vta',canal:'wc',sku:res.product.sku,nombre:res.product.nombre,kg:res.product.kg,qty:res.qty,date:fStr,ts:Date.now()});
        matched++;
      } else {
        noMatch.push((marca?marca+' - ':'')+prod+(kg?' ('+kg+'kg)':''));
      }
    });
    skSave();
    st.textContent=matched+' ventas sincronizadas.';st.style.color='var(--verde)';
    var nmDiv=document.getElementById('sk-wc-noMatch');
    var nmList=document.getElementById('sk-wc-noMatchList');
    if(noMatch.length){
      nmDiv.style.display='block';
      // Deduplicar
      var uniq=[...new Set(noMatch)];
      nmList.innerHTML=uniq.map(function(x){return'<div style="padding:2px 0;border-bottom:1px solid #f0f0f0">'+x+'</div>';}).join('');
    } else {
      nmDiv.style.display='none';
    }
    skRenderTabla();skRenderMetricas();
  }).catch(function(e){st.textContent='Error: '+e.message;st.style.color='#c0392b';});
}

function skMatchProduct(marca,prod,kg){
  // Normalizar: minusculas, sin tildes, solo letras/numeros/+
  function norm(s){return(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+]/g,' ').replace(/\s+/g,' ').trim();}
  // Expandir abreviaturas palabra por palabra
  function expand(s){
    var W={
      'adu':'adult','adulto':'adult','cachorro':'puppy','peque':'small',
      'med':'medium','mediano':'medium','maxi':'maxi','mini':'mini',
      'mob':'mobility','mobilty':'mobility','mobil':'mobility',
      'hypo':'hypoallergenic','hypoallargenic':'hypoallergenic',
      'dachs':'dachshund','dasch':'dachshund','duchs':'dachshund',
      'sf':'superfood','roa':'royal','cordero':'cordero',
      'gastroenteric':'gastro','persa':'persian',
      'wc':'weight control','weight':'weight control'
    };
    return norm(s).split(' ').map(function(w){return W[w]||w;}).join(' ');
  }
  var input=expand(marca)+' '+expand(prod);
  // Marca: si el input trae marca reconocible, solo se comparan SKUs de esa marca
  function brandInput(s){
    var B=[['royal','RC'],['canin','RC'],['optimus','OPT'],['pro plan','PP'],['proplan','PP'],['excellent','EX'],['eukanuba','EK'],['old prince','OP'],['fawna','FW'],['unik','UK'],['club performance','CP'],['balanced','BAL'],['mon ami','MON'],['nutrique','NUT'],['prof','PROF']];
    for(var i=0;i<B.length;i++){if((' '+s+' ').indexOf(' '+B[i][0])>=0)return B[i][1];}
    return null;
  }
  function brandSku(sku){
    var s=(sku||'').toUpperCase();
    var P=[['PROF','PROF'],['OPT','OPT'],['OSCAT','OPT'],['OP','OP'],['RC','RC'],['PP','PP'],['PRO','PP'],['EUKA','EK'],['EK','EK'],['EX','EX'],['FW','FW'],['UK','UK'],['CP','CP'],['BAL','BAL'],['MON','MON'],['NUT','NUT'],['NUR','NUT']];
    for(var i=0;i<P.length;i++){if(s.indexOf(P[i][0])===0)return P[i][1];}
    return null;
  }
  var inBrand=brandInput(input);
  var best=null,bestScore=0,bestQty=1,bestExtra=99;
  SK_PRODUCTS.forEach(function(p){
    if(inBrand&&brandSku(p.sku)!==inBrand)return;
    var skuExp=expand(p.nombre);
    var score=0,qty=1;
    // Score por kg
    if(kg>0){
      var diff=Math.abs(p.kg-kg);
      if(diff<=0.6)score+=5;          // 7.5 vs 8 ok
      else if(diff<=1.5)score+=2;
      else if(p.kg>0){
        var q=kg/p.kg,qr=Math.round(q);
        if(qr>=2&&Math.abs(q-qr)<0.15){qty=qr;score+=3;} // 6kg de 3kg = 2 uds
      }
    }
    // Score por palabras: cada palabra del SKU que aparece en el input
    var extra=0;
    skuExp.split(' ').filter(Boolean).forEach(function(w){
      var cuenta=w.length>=3||/[+0-9]/.test(w);
      if((' '+input+' ').indexOf(' '+w+' ')>=0||(cuenta&&input.indexOf(w)>=0)){if(cuenta)score+=2;}
      else extra++;
    });
    // Bonus: palabras del input en el SKU (match bidireccional)
    expand(prod).split(' ').filter(function(w){return w.length>=4;}).forEach(function(w){
      if(skuExp.indexOf(w)>=0)score+=1;
    });
    // Penalizar etapa de vida que el input no menciona (ej: "Hypo" no es "Hypo Puppy")
    ['puppy','kitten','junior','senior','ageing'].forEach(function(w){
      if(skuExp.indexOf(w)>=0&&input.indexOf(w)<0)score-=3;
    });
    // Desempate: gana el SKU con menos palabras que el input no menciona (ej: Gastro vs Gastro MC)
    if(score>bestScore||(score===bestScore&&best&&extra<bestExtra)){bestScore=score;best=p;bestQty=qty;bestExtra=extra;}
  });
  if(!best||bestScore<5)return null;
  return{product:best,qty:bestQty};
}

function skSubTab(tab){
  ['stock','movs','ajuste'].forEach(function(t){
    var view=document.getElementById('skview-'+t);
    var btn=document.getElementById('sktab-'+t);
    if(view)view.style.display=t===tab?'':'none';
    if(btn){btn.style.borderBottomColor=t===tab?'var(--text-primary)':'transparent';btn.style.fontWeight=t===tab?'600':'400';btn.style.color=t===tab?'var(--text-primary)':'var(--gris-dark)';}
  });
  if(tab==='stock'){skRenderTabla();skRenderMetricas();}
  if(tab==='movs'){
    var hoy=new Date().toISOString().slice(0,10);
    var d=document.getElementById('sk-mov-desde'),h=document.getElementById('sk-mov-hasta');
    if(d&&!d.value)d.value=hoy;if(h&&!h.value)h.value=hoy;
    skRenderMovs();
  }
  if(tab==='ajuste'){
    var hoy=new Date().toISOString().slice(0,10);
    var da=document.getElementById('sk-aj-d');if(da&&!da.value)da.value=hoy;
    skRenderAjustes();
  }
}

function skRenderMovs(){
  var desde=(document.getElementById('sk-mov-desde')||{}).value||'';
  var hasta=(document.getElementById('sk-mov-hasta')||{}).value||'';
  var tipo=(document.getElementById('sk-mov-tipo')||{}).value||'';
  var filtered=skMovs.filter(function(m){
    if(desde&&m.date<desde)return false;
    if(hasta&&m.date>hasta)return false;
    if(tipo==='ing'&&m.type!=='ing')return false;
    if(tipo==='wc'&&m.canal!=='wc')return false;
    if(tipo==='meli'&&m.canal!=='meli')return false;
    return true;
  }).sort(function(a,b){return b.ts-a.ts;});
  var tb=document.getElementById('sk-mov-tabla');
  if(!tb)return;
  if(!filtered.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin movimientos para ese período</div>';document.getElementById('sk-mov-total').textContent='';return;}
  tb.innerHTML=filtered.map(function(m,i){
    var realIdx=skMovs.indexOf(m);
    var tipoLabel=m.type==='ing'?'<span style="color:var(--verde);font-weight:600">Ingreso</span>':m.canal==='wc'?'<span style="color:var(--azul-med);font-weight:500">V. WC</span>':'<span style="color:#8b5cf6;font-weight:500">V. Meli</span>';
    var cantColor=m.type==='ing'?'color:var(--verde)':'color:#c0392b';
    var cantSign=m.type==='ing'?'+':'-';
    var skProd=SK_PRODUCTS.filter(function(p){return p.sku===m.sku;})[0];
    var costo=skProd?skProd.costo:0;
    var valorStr=costo>0?'$'+(costo*m.qty/1000).toFixed(1)+'K':'—';
    return'<div class="table-row" style="grid-template-columns:90px 2fr 1fr 60px 70px 70px 100px 60px"><span style="font-size:12px">'+m.date+'</span><span style="font-size:12px" title="'+m.nombre+'">'+m.nombre+'</span><span style="font-family:monospace;font-size:11px;color:var(--gris-dark)">'+m.sku+'</span><span style="font-size:12px">'+m.kg+'</span><span>'+tipoLabel+'</span><span style="font-weight:600;'+cantColor+'">'+cantSign+m.qty+'</span><span style="font-size:12px;font-weight:500">'+valorStr+'</span><span><button onclick="skEliminarMov('+realIdx+')" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:16px;line-height:1" title="Eliminar">×</button></span></div>';
  }).join('');
  var totalIng=filtered.filter(function(m){return m.type==='ing';}).reduce(function(s,m){return s+m.qty;},0);
  var totalVta=filtered.filter(function(m){return m.type!=='ing';}).reduce(function(s,m){return s+m.qty;},0);
  var totalValor=filtered.reduce(function(s,m){var p=SK_PRODUCTS.filter(function(x){return x.sku===m.sku;})[0];return s+(p?p.costo*m.qty:0);},0);
  document.getElementById('sk-mov-total').innerHTML=filtered.length+' movimientos &nbsp;·&nbsp; <b>'+totalIng+'</b> ingr. &nbsp;·&nbsp; <b>'+totalVta+'</b> vendidas &nbsp;·&nbsp; Valor total costo: <b>$'+Math.round(totalValor).toLocaleString("es-AR")+'</b>';
}

function skRegistrarAjuste(){
  if(!skSel['aj']){alert('Seleccioná un producto');return;}
  var n=parseInt((document.getElementById('sk-aj-n')||{}).value||'0');
  if(isNaN(n)||n<0){alert('Ingresá una cantidad válida');return;}
  var tipo=document.getElementById('sk-aj-tipo').value;
  var motivo=(document.getElementById('sk-aj-motivo')||{}).value||'Sin motivo';
  var d=(document.getElementById('sk-aj-d')||{}).value||new Date().toISOString().slice(0,10);
  var p=skSel['aj'];
  // Para 'fija': calculamos el stock actual y hacemos el ajuste necesario
  if(tipo==='fija'){
    var calc=skCalc();
    var cur=calc.filter(function(r){return r.sku===p.sku;})[0];
    var actual=cur?(cur.i-cur.wc-cur.ml):0;
    var diff=n-actual;
    if(diff===0){alert('El stock ya está en '+n+' unidades. No hay ajuste necesario.');return;}
    skMovs.push({type:diff>0?'ing':'vta',canal:diff>0?'ing':'ajuste',sku:p.sku,nombre:p.nombre,kg:p.kg,qty:Math.abs(diff),date:d,ts:Date.now(),ajuste:true,motivo:motivo});
  } else {
    skMovs.push({type:tipo==='suma'?'ing':'vta',canal:tipo==='suma'?'ing':'ajuste',sku:p.sku,nombre:p.nombre,kg:p.kg,qty:n,date:d,ts:Date.now(),ajuste:true,motivo:motivo});
  }
  skSave();
  skSel['aj']=null;
  document.getElementById('sk-aj-q').value='';
  document.getElementById('sk-aj-tag').innerHTML='';
  document.getElementById('sk-aj-n').value='';
  document.getElementById('sk-aj-motivo').value='';
  skRenderAjustes();skRenderTabla();skRenderMetricas();
  alert('Ajuste registrado');
}

function skRenderAjustes(){
  var ajustes=skMovs.filter(function(m){return m.ajuste;}).sort(function(a,b){return b.ts-a.ts;});
  var tb=document.getElementById('sk-aj-tabla');if(!tb)return;
  if(!ajustes.length){tb.innerHTML='<div style="padding:20px;text-align:center;color:var(--gris-dark);font-size:13px">Sin ajustes registrados</div>';return;}
  tb.innerHTML=ajustes.map(function(m){
    var realIdx=skMovs.indexOf(m);
    var tipoLabel=m.type==='ing'?'<span style="color:var(--verde)">+'+m.qty+'</span>':'<span style="color:#c0392b">-'+m.qty+'</span>';
    var tipoStr=m.type==='ing'?'Suma':'Resta';
    return'<div class="table-row" style="grid-template-columns:90px 2fr 80px 80px 1fr 60px"><span style="font-size:12px">'+m.date+'</span><span style="font-size:12px" title="'+m.nombre+'">'+m.nombre+'</span><span style="font-size:12px">'+tipoStr+'</span><span>'+tipoLabel+'</span><span style="font-size:11px;color:var(--gris-dark)">'+m.motivo+'</span><span><button onclick="skEliminarMov('+realIdx+')" style="background:none;border:none;cursor:pointer;color:#c0392b;font-size:16px" title="Eliminar">×</button></span></div>';
  }).join('');
}

function skEliminarMov(idx){
  if(!confirm('¿Eliminar este movimiento?'))return;
  skMovs.splice(idx,1);
  skSave();
  skRenderMovs();
  skRenderTabla();
  skRenderMetricas();
}

function skBorrarTodo(){if(confirm('¿Borrar todos los movimientos de stock?')){skMovs=[];skSave();skRenderTabla();skRenderMetricas();}}

document.addEventListener('click',function(e){
  ['sk-ing-dd','sk-vta-dd','sk-aj-dd'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&!el.contains(e.target)&&e.target.id!==id.replace('-dd','-q'))el.style.display='none';
  });
});

skLoad();skRenderTabla();skRenderMetricas();


