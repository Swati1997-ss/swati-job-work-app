(() => {
  'use strict';

  const GU_TO_EN = {
    'મુખ્ય':'Home',
    'મજૂરી કામ':'Job Work',
    'કંપની પ્રોડક્શન':'Company Production',
    'તેલ પ્રોડક્શન':'Oil Production',
    'તેલ વેચાણ':'Oil Sales',
    'તેલ સ્ટોક':'Oil Stock',
    'તેલ મીલ':'Oil Mill',
    'અનાજ / કઠોળ':'Grain / Pulse',
    'ગ્રાહકો':'Customers',
    'ખરીદી':'Purchases',
    'ખર્ચ':'Expenses',
    'વપરાશ':'Usage',
    'ફાઇનાન્સ':'Finance',
    'હિસ્ટ્રી':'History',
    'રિપોર્ટ્સ':'Reports',
    'સેટિંગ્સ':'Settings',
    'સ્ટોક':'Stock',
    'વેચાણ':'Sales',
    'આજનો સારાંશ':'Today’s Summary',
    'આજની કામગીરી એક નજરમાં':'Today’s activity at a glance',
    'જરૂરી કામ માટે સીધો વિકલ્પ પસંદ કરો.':'Choose a direct action for the work you need.',
    'તેલ મીલની નવી એન્ટ્રી':'New Oil Mill entry',
    'કંપનીનો નવો બેચ':'New company production batch',
    'કંપનીના તેલનું વેચાણ':'Sell company-produced oil',
    'મજૂરીની નવી એન્ટ્રી':'New Job Work entry',
    'ગામ મુજબ ગ્રાહકો':'Customers by village',
    'બધા વિભાગની purchase entry':'Purchase entry for all divisions',
    'Electricity, labour, transport વગેરે':'Electricity, labour, transport, etc.',
    'Cash, bank, payable, receivable':'Cash, bank, payables, receivables',
    'આજનું મજૂરી કામ':'Today’s Job Work',
    'આજનું કંપની પ્રોડક્શન':'Today’s Company Production',
    'આજનું તેલ વેચાણ':'Today’s Oil Sales',
    'હાલનો કંપની સ્ટોક':'Current Company Stock',
    'આજનું બાકી':'Today’s Outstanding',
    'કુલ ગ્રાહકો':'Total Customers',
    'કુલ ટ્રાન્ઝેક્શન':'Total Transactions',
    'ખોળ સ્ટોક':'Khali Stock',
    'આજે':'Today',
    'આ મહિનો':'This Month',
    'કુલ ખર્ચ':'Total Expenses',
    'કુલ ખરીદી':'Total Purchases',
    'કુલ વેચાણ':'Total Sales',
    'કુલ બાકી':'Total Outstanding',
    'કુલ પેમેન્ટ':'Total Payments',
    'કુલ મજૂરી':'Total Job Work',
    'લેવાના':'Receivable',
    'આપવાના':'Payable',
    'કુલ લેવાના':'Total Receivable',
    'કુલ આપવાના':'Total Payable',
    'રોકડ':'Cash',
    'બેંક / UPI':'Bank / UPI',
    'બેંક/UPI':'Bank / UPI',
    'તારીખ':'Date',
    'ગ્રાહક':'Customer',
    'Supplier / Party':'Supplier / Party',
    'ગામ':'Village',
    'મોબાઇલ':'Mobile',
    'મોબાઇલ નંબર':'Mobile Number',
    'નામ *':'Name *',
    'નામ:':'Name:',
    'ગામ:':'Village:',
    'તા.:':'Date:',
    'બિલ:':'Bill:',
    'બિલ':'Bill',
    'બિલ નંબર':'Bill Number',
    'નોંધ':'Notes',
    'રકમ':'Amount',
    'રકમ ₹':'Amount ₹',
    'ભાવ':'Rate',
    'ભાવ ₹ / કિલો':'Rate ₹ / kg',
    'ભાવ ₹ / Unit':'Rate ₹ / Unit',
    'ભાવ ₹ / યુનિટ':'Rate ₹ / Unit',
    'ભાવ ₹ / એકમ':'Rate ₹ / Unit',
    'ભાવ ₹ / ડબો':'Rate ₹ / Tin',
    'જથ્થો':'Quantity',
    'જથ્થો (કિલો)':'Quantity (kg)',
    'વજન (કિલો)':'Weight (kg)',
    'વજન / જથ્થો':'Weight / Quantity',
    'એકમ':'Unit',
    'યુનિટ':'Unit',
    'કિલો':'kg',
    'ટીન':'Tin',
    'ડબો':'Tin',
    'બેગ':'Bag',
    'બેગ / કોથળો':'Bag / Sack',
    'નંગ':'Piece',
    'મણ':'Mann',
    'ટન (TON)':'Ton (TON)',
    'લિટર':'Litre',
    'માલ':'Material',
    'માલનો પ્રકાર':'Material Type',
    'કાચો માલ':'Raw Material',
    'પેકેજિંગ':'Packaging',
    'મશીનરી / Parts':'Machinery / Parts',
    'અન્ય':'Other',
    'શું ખરીદ્યું?':'What was purchased?',
    'માલની કિંમત':'Goods Value',
    'Extra ખર્ચ':'Extra Expense',
    'Supplier બાકી':'Supplier Payable',
    'Advance / જમા':'Advance / Credit',
    'ચૂકવેલ ₹':'Paid ₹',
    'ચૂકવેલ / મળેલ':'Paid / Received',
    'અત્યારે ચૂકવેલ / મળેલ ₹':'Paid / Received Now ₹',
    'ચુકવણી':'Payment',
    'ચુકવણી રીત':'Payment Method',
    'ચુકવણી ઉમેરો':'Add Payment',
    'ચુકવણી સાચવો':'Save Payment',
    'ખરીદી સાચવો':'Save Purchase',
    'વેચાણ સાચવો':'Save Sale',
    'ખર્ચ સાચવો':'Save Expense',
    'વપરાશ સાચવો':'Save Usage',
    'સાચવો':'Save',
    'Settings સાચવો':'Save Settings',
    'Operators સાચવો':'Save Operators',
    'Operator બદલો':'Change Operator',
    'આ ડિવાઇસ કોનું છે?':'Who uses this device?',
    'આ ડિવાઇસનો Operator':'Device Operator',
    'વિભાગ':'Division',
    'ઉત્પાદન / પ્રોસેસિંગ':'Production / Processing',
    'આખી કંપની':'Whole Company',
    'ખર્ચ પ્રકાર':'Expense Type',
    'ખર્ચનું નામ':'Expense Name',
    'ઇલેક્ટ્રિસિટી':'Electricity',
    'ટ્રાન્સપોર્ટ ₹':'Transport ₹',
    'લોડિંગ ₹':'Loading ₹',
    'અનલોડિંગ ₹':'Unloading ₹',
    'કોલ્ડ સ્ટોરેજ':'Cold Storage',
    'જરૂર હોય ત્યારે જ દાખલ કરો.':'Enter only when needed.',
    'ખરીદી સાથેના ખર્ચ':'Purchase-related Expenses',
    'ખરીદી હિસ્ટ્રી':'Purchase History',
    'ખર્ચ હિસ્ટ્રી':'Expense History',
    'તાજેતરની ખરીદી':'Recent Purchases',
    'તાજેતરના ખર્ચ':'Recent Expenses',
    'તાજેતરના બેચ':'Recent Batches',
    'તાજેતરનું વેચાણ':'Recent Sales',
    'તાજેતરનો વપરાશ':'Recent Usage',
    'બધા':'All',
    'બધી':'All',
    'બધું':'All',
    'શોધો':'Search',
    'શરૂઆત તારીખ':'Start Date',
    'અંત તારીખ':'End Date',
    'સમયગાળો':'Period',
    'સમયગાળો શરૂ':'Period Start',
    'સમયગાળો અંત':'Period End',
    'સમયગાળો પસંદ કરો':'Select Period',
    'છેલ્લા 7 દિવસ':'Last 7 Days',
    'આ સીઝન / વર્ષ':'This Season / Year',
    'સીઝન':'Season',
    'રિપોર્ટ':'Report',
    'કુલ સારાંશ':'Overall Summary',
    'દિવસ મુજબ સારાંશ':'Daily Summary',
    'ગ્રાહક સારાંશ':'Customer Summary',
    'ગામ મુજબ સારાંશ':'Village Summary',
    'જરૂર મુજબ રિપોર્ટ પસંદ કરો અને નીચે વિગત જુઓ.':'Choose a report and view the details below.',
    'તારીખ પ્રમાણે ટ્રાન્ઝેક્શન અને કુલ રકમ':'Transactions and totals by date',
    'ગામ પ્રમાણે ગ્રાહકો, ટ્રાન્ઝેક્શન અને બાકી':'Customers, transactions and outstanding by village',
    'ગ્રાહકો, ગામ અને મજૂરીની વિગતો':'Customer, village and Job Work details',
    'મજૂરી, ખરીદી, વેચાણ અને બાકીનો એક નજરમાં હિસાબ':'Job Work, purchases, sales and outstanding at a glance',
    'કાર્ડ જુઓ':'View Card',
    'પ્રિન્ટ / PDF':'Print / PDF',
    'શેર કરો':'Share',
    'ડાઉનલોડ':'Download',
    'ફાઇલ':'File',
    'ફાઇલ તૈયાર છે':'File is ready',
    'ફાઇલ ખોલો, શેર કરો અથવા ડાઉનલોડ કરો.':'Open, share or download the file.',
    'ખોલો / App પસંદ કરો':'Open / Choose App',
    'એપ ઇન્સ્ટોલ':'Install App',
    'Internet મળ્યા પછી Auto Sync':'Auto Sync when internet is available',
    'ડેટા':'Data',
    'ઉપલબ્ધ':'Available',
    'ઉપલબ્ધ સ્ટોક':'Available Stock',
    'ઉપલબ્ધ સ્ટોક પસંદ કરો.':'Select available stock.',
    'સ્ટોક / Batch':'Stock / Batch',
    'Batch સાચવો':'Save Batch',
    'બેચ સાચવો':'Save Batch',
    'નવો Batch બનાવો':'Create New Batch',
    'નવો પ્રોડક્શન બેચ':'New Production Batch',
    'કાચા માલની ખરીદી':'Raw Material Purchase',
    'કંપનીના પોતાના કાચા માલમાંથી પ્રોડક્શન બેચ બનાવો.':'Create a production batch from company-owned raw material.',
    'કાચા માલ અને કંપનીના તૈયાર માલનો અલગ સ્ટોક.':'Separate stock for raw material and company finished goods.',
    'કંપનીના પોતાના તૈયાર તેલનું વેચાણ.':'Sale of company-owned finished oil.',
    'મગફળી':'Groundnut',
    'મગફળી Raw Stock':'Groundnut Raw Stock',
    'મગફળી વપરાઈ (કિલો)':'Groundnut Used (kg)',
    'તેલ':'Oil',
    'તેલ બન્યું (કિલો)':'Oil Produced (kg)',
    'તેલ Finished Stock':'Oil Finished Stock',
    'ખોળ':'Khali',
    'ખોળ બન્યો (કિલો)':'Khali Produced (kg)',
    'ખોળ Stock':'Khali Stock',
    'વેસ્ટ / Loss (કિલો)':'Waste / Loss (kg)',
    '15 કિલો ટીન':'15 kg Tin',
    '15 કિલો ટીન ભર્યા':'15 kg Tins Filled',
    'એક Production Run = એક Batch = Oil + Khali':'One Production Run = One Batch = Oil + Khali',
    'બેચ':'Batch',
    'બેચ સાચવો':'Save Batch',
    'Batchમાં':'In Batch',
    'Batchમાં ગયેલ':'Used in Batch',
    'કુલ Batch Profit':'Total Batch Profit',
    'કુલ Cost':'Total Cost',
    'ખરીદી કિંમત':'Purchase Cost',
    'આ Batchની ખરીદી કિંમત':'Purchase Cost of this Batch',
    'Processing / અન્ય ખર્ચ':'Processing / Other Expense',
    'Processing / અન્ય ખર્ચ ₹':'Processing / Other Expense ₹',
    'ખરીદેલ':'Purchased',
    'ખરીદેલ જથ્થો (કિલો)':'Purchased Quantity (kg)',
    'વેચાણ તારીખ':'Sale Date',
    'વેચાણ પ્રકાર':'Sale Type',
    'વેચાણની કુલ રકમ ₹':'Total Sale Amount ₹',
    'કંપનીના બધા ખર્ચ division અને unit પ્રમાણે manage કરો.':'Manage all company expenses by division and unit.',
    'બંને વિભાગની ખરીદી એક જ જગ્યાએ — division અને unit પ્રમાણે અલગ.':'Manage purchases for both divisions in one place, separated by division and unit.',
    'બધા વિભાગ અને યુનિટની ખરીદી':'Purchases across all divisions and units',
    'Division, unit અને category પ્રમાણે':'By division, unit and category',
    'Company-wide stockમાંથી કયા division/unitમાં માલ વપરાયો તે નોંધો.':'Record where company-wide stock was used by division/unit.',
    'Company-wide money position, liquidity, stock value અને borrowing visibility.':'Company-wide money position, liquidity, stock value and borrowing visibility.',
    'Company-wide ledgerમાંથી Grain/Pulse stock view.':'Grain/Pulse stock view from the company-wide ledger.',
    'કંપનીના અનાજ / કઠોળ processing માટેનું production workspace.':'Workspace for company-owned Grain/Pulse processing.',
    'અનાજ / કઠોળ અને empty bags ખરીદો':'Purchase grain/pulses and empty bags',
    'Packaging / consumables usage નોંધો':'Record packaging / consumables usage',
    'Raw / Processed / Waste stock જુઓ':'View raw / processed / waste stock',
    'Processed grain/pulse અને waste/by-product sales માટેનું workspace.':'Workspace for processed Grain/Pulse and waste/by-product sales.',
    'આ screen Grain/Pulse sales માટે અલગ રાખવામાં આવી છે. Detailed sale-entry workflow next functional expansionમાં જોડાશે.':'This screen is reserved for Grain/Pulse sales. Detailed sales entry will be added in a later functional stage.',
    'ઇન્ટરફેસ ભાષા':'Interface Language',
    'ભાષા':'Language',
    'ફક્ત app interface બદલાશે; business data/PDF Gujaratiમાં જ રહેશે.':'Only the app interface changes; business data and PDFs remain in Gujarati.',
    'ગુજરાતી':'ગુજરાતી',
    'પાછા':'Back',
    '← પાછા':'← Back',
    '← ગામ':'← Village',
    '← ગ્રાહકો':'← Customers',
    'નવું સાફ કરો':'Clear New',
    'ઉમેરવું':'Add',
    'સરભર':'Settlement',
    'અંતિમ સરભર':'Final Settlement',
    'અંતિમ રકમ':'Final Amount',
    'ખેડૂત પાસેથી લેવાના':'Receivable from Farmer',
    'ખેડૂતને આપવાના':'Payable to Farmer',
    'ગ્રાહકને આપવાના':'Payable to Customer',
    'ગ્રાહક લાવેલ માલ અને નીકળેલ તેલ':'Customer Material and Oil Output',
    'ગ્રાહકે અમારી પાસેથી લીધેલું':'Taken by Customer from Us',
    'આ કાર્ડ ગ્રાહકના મજૂરી અને સરભર માટે છે.':'This card is for customer Job Work and settlement.',
    'મજૂરી':'Job Work',
    'મજૂરી History':'Job Work History',
    'મજૂરી ₹ / ડબો':'Job Work ₹ / Tin',
    '1 ડબોમાં તેલ (કિલો)':'Oil per Tin (kg)',
    'ખોળનો Default ભાવ ₹ / કિલો':'Default Khali Rate ₹ / kg',
    'નવા ડબોનો Default ભાવ ₹':'Default New Tin Rate ₹',
    'વધેલા માલનો Default ભાવ ₹ / કિલો':'Default Excess Material Rate ₹ / kg',
    'અનાજ/કઠોળ — આધાર મજૂરી ₹':'Grain/Pulse — Base Job Work ₹',
    'અનાજ/કઠોળ — આધાર વજન (કિલો)':'Grain/Pulse — Base Weight (kg)',
    'તેલ મિલ બિલ Prefix':'Oil Mill Bill Prefix',
    'અનાજ/કઠોળ બિલ Prefix':'Grain/Pulse Bill Prefix',
    'તેલ મિલ Excel':'Oil Mill Excel',
    'અનાજ / કઠોળ Excel':'Grain/Pulse Excel',
    'સાફ થયેલ સારો માલ':'Clean Good Material',
    'સાફ થયેલ સારો માલ (કિલો)':'Clean Good Material (kg)',
    'ખરાબ / વધેલો માલ':'Reject / Excess Material',
    'ખરાબ / વધેલો માલ (કિલો)':'Reject / Excess Material (kg)',
    'વધેલા માલની ખરીદી':'Excess Material Purchase',
    'વધેલો માલ અમે ખરીદ્યો / રાખ્યો':'Excess Material Purchased / Retained',
    'વધેલો માલ ખરીદી':'Purchase Excess Material',
    'વધેલો માલ — અમારી પાસે રાખેલ':'Excess Material — Retained by Us',
    'મજૂરી = સાફ થયેલ સારો માલ + ખરાબ / વધેલો માલ. ભાવ સેટિંગ્સમાંથી બદલી શકાય છે.':'Job Work = clean good material + reject/excess material. Rates can be changed in Settings.',
    'અનાજ / કઠોળ સફાઈ':'Grain / Pulse Cleaning',
    'ઘઉં':'Wheat',
    'ચણા':'Chana',
    'મગ':'Moong',
    'દાણા / ફાડા':'Grains / Splits',
    'સિંગ / ગોગળા':'Peanuts / Pods',
    'સુલતાનપુર — અનાજ / કઠોળ સફાઈ':'Sultanpur — Grain / Pulse Cleaning',
    'પસંદ કરેલું ગામ':'Selected Village',
    'પહેલા ગામ પસંદ કરો, પછી તે ગામના ગ્રાહકો જુઓ.':'Select a village first, then view customers from that village.',
    '0 ગામ':'0 Villages',
    '0 ગ્રાહકો':'0 Customers',
    '0 ટીન':'0 Tins',
    '0 કિલો':'0 kg'
  };

  const EN_TO_GU = Object.fromEntries(
    Object.entries(GU_TO_EN)
      .filter(([gu,en]) => gu !== en)
      .map(([gu,en]) => [en,gu])
  );

  const ATTR_MAP = {
    'ઉદાહરણ: August Electricity Bill':'e.g. August Electricity Bill',
    'ગ્રાહકનું નામ':'Customer name',
    'આઇટમનું નામ':'Item name',
    'મોબાઇલ':'Mobile',
    'ગામ':'Village',
    'નામ':'Name',
    'Optional':'Optional'
  };
  const ATTR_REVERSE = Object.fromEntries(Object.entries(ATTR_MAP).map(([a,b])=>[b,a]));

  const skipOutput = el => !!el?.closest?.('.physical-card, .single-print-card, .grain-print-table');

  function translateExact(text, lang) {
    const trimmed = text.trim();
    if (!trimmed) return text;

    const map = lang === 'en' ? GU_TO_EN : EN_TO_GU;
    if (map[trimmed] !== undefined) {
      const left = text.match(/^\s*/)?.[0] || '';
      const right = text.match(/\s*$/)?.[0] || '';
      return left + map[trimmed] + right;
    }

    if (lang === 'en') {
      let x = trimmed;
      x = x.replace(/^ખરીદી ([\d.]+) kg • વપરાશ ([\d.]+) kg$/, 'Purchased $1 kg • Used $2 kg');
      x = x.replace(/^પ્રોડક્શન ([\d.]+) kg • વેચાણ ([\d.]+) kg$/, 'Produced $1 kg • Sold $2 kg');
      x = x.replace(/^બન્યો ([\d.]+) kg • વેચાણ ([\d.]+) kg$/, 'Produced $1 kg • Sold $2 kg');
      x = x.replace(/^ભરેલા ([\d.]+) • વેચાયેલા ([\d.]+)$/, 'Filled $1 • Sold $2');
      x = x.replace(/^બાકી (₹.*)$/, 'Outstanding $1');
      x = x.replace(/^કુલ: (.*)$/, 'Total: $1');
      x = x.replace(/^(\d+) બિલ$/, '$1 Bills');
      x = x.replace(/^(\d+) વેચાણ$/, '$1 Sales');
      x = x.replace(/^(\d+) બેચ$/, '$1 Batches');
      x = x.replace(/^(\d+) ગામ$/, '$1 Villages');
      x = x.replace(/^(\d+) ગ્રાહકો$/, '$1 Customers');
      if (x !== trimmed) {
        const left = text.match(/^\s*/)?.[0] || '';
        const right = text.match(/\s*$/)?.[0] || '';
        return left + x + right;
      }
    }

    return text;
  }

  function translateTextNodes(root, lang) {
    if (!root || skipOutput(root.nodeType === 1 ? root : root.parentElement)) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const p = node.parentElement;
          if (!p) return NodeFilter.FILTER_REJECT;
          if (skipOutput(p)) return NodeFilter.FILTER_REJECT;
          if (['SCRIPT','STYLE','TEXTAREA'].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
          return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = translateExact(node.nodeValue, lang);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function translateAttributes(root, lang) {
    const els = [];
    if (root?.nodeType === 1) els.push(root);
    root?.querySelectorAll?.('input[placeholder], textarea[placeholder], [title], [aria-label]')?.forEach(el=>els.push(el));

    els.forEach(el => {
      if (skipOutput(el)) return;
      ['placeholder','title','aria-label'].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const current = el.getAttribute(attr);
        const map = lang === 'en' ? ATTR_MAP : ATTR_REVERSE;
        if (map[current]) el.setAttribute(attr,map[current]);
      });
    });
  }

  function apply(lang='gu', root=document.body) {
    const l = lang === 'en' ? 'en' : 'gu';
    translateTextNodes(root,l);
    translateAttributes(root,l);
  }

  let currentLang = 'gu';
  let observer = null;

  function setLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'gu';
    apply(currentLang, document.body);

    if (!observer) {
      observer = new MutationObserver(mutations => {
        observer.disconnect();
        try {
          mutations.forEach(m => {
            if (m.type === 'childList') {
              m.addedNodes.forEach(n => {
                if (n.nodeType === 1) apply(currentLang,n);
                else if (n.nodeType === 3 && n.parentElement && !skipOutput(n.parentElement)) {
                  n.nodeValue = translateExact(n.nodeValue,currentLang);
                }
              });
            } else if (m.type === 'characterData') {
              const n=m.target;
              if (n.parentElement && !skipOutput(n.parentElement)) {
                n.nodeValue=translateExact(n.nodeValue,currentLang);
              }
            }
          });
        } finally {
          observer.observe(document.body,{subtree:true,childList:true,characterData:true});
        }
      });
      observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    }
  }

  window.SwatiI18n = { setLanguage, apply, GU_TO_EN };
})();