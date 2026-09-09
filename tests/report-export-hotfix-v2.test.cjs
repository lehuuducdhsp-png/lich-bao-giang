const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const logoCode=fs.readFileSync('report-logo-data-v1.js','utf8');
const match=logoCode.match(/data:image\/jpeg;base64,([^']+)/);assert(match,'missing embedded JPEG logo');
const logoBytes=Buffer.from(match[1],'base64');
assert.equal(logoBytes.length,8377,'unexpected embedded logo byte length');
assert.equal(crypto.createHash('sha256').update(logoBytes).digest('hex'),'d3b24dafad4068c9b659021925bea2d52beca2577bc7b1f976f3909dec22f2e1','embedded logo hash changed unexpectedly');
assert.equal(logoBytes[0],0xFF);assert.equal(logoBytes[1],0xD8);assert.equal(logoBytes.at(-2),0xFF);assert.equal(logoBytes.at(-1),0xD9);

const code=fs.readFileSync('report-export-hotfix-v2.js','utf8');
const context={console,setTimeout,clearTimeout,setInterval,clearInterval,window:{saveAs:()=>{},ExcelJS:{},LBG_HOAN_NANG_LOGO_JPEG:`data:image/jpeg;base64,${match[1]}`},document:{readyState:'loading',addEventListener:()=>{}},navigator:{},URL:{}};context.global=context;vm.createContext(context);vm.runInContext(code,context);
const api=context.window.LBGReportExportHotfixV2;assert(api,'missing API');
assert.equal(api.shiftRange('A1:H1',3),'A4:H4');
assert.equal(api.shiftRange('A5:A10',3),'A8:A13');
assert.equal(api.shiftRange('E17:H17',3),'E20:H20');
const logo=api.getLogoImage();assert.equal(logo.extension,'jpeg');assert.ok(logo.base64.startsWith('data:image/jpeg;base64,/9j/'));
assert.doesNotMatch(code,/fetch\(LOGO_URL/,'export must not fetch the previously corrupted logo asset');
console.log('OK report export hotfix helpers + verified embedded JPEG logo');
