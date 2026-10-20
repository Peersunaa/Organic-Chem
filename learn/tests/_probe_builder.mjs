import { ready, canon } from '../engine/chem.js';
import * as R from '../engine/reactions.js';
await ready();
const alk = ['C=C','CC=C','CC(C)=C','CCC=C','C/C=C\C','C/C=C/C','CC=C(C)C','C1=CCCCC1','CC1=CCCCC1','CC1=C(C)CCCC1','C=Cc1ccccc1','C=C1CCCCC1'];
const t = (f) => { try { const r = f(); return r && r.products ? r.products.join('.') + (r.outcome? ' ['+r.outcome+']':'') : JSON.stringify(r).slice(0,80); } catch (e) { return 'ERR ' + e.message.slice(0,70); } };
for (const a of alk) {
  console.log(a, '| HBr', t(()=>R.predict(a,'HBr')), '| H2O', t(()=>R.predict(a,'H2O')));
  for (const k of R.REAGENT_IDS2) console.log('   ', k, t(()=>R.predictAdd(a,k)));
}
const aky = ['C#C','CC#C','CCC#C','CC#CC','CCCCC#C','CCC#CCC','C#Cc1ccccc1'];
for (const a of aky) { for (const k of R.ALKYNE_KEYS) console.log(a, k, t(()=>R.predictAlkyne(a,k))); }
