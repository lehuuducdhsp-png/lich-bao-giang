'use strict';
(function(){
  const STYLE_ID='lbgGaInputVisualFixV1Css';
  const VERSION='20260903.1';

  function mount(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement('style');
      style.id=STYLE_ID;
      style.textContent=`
        /* Ô nhập số giáo án: ưu tiên hiển thị rõ 2 chữ số theo mẫu (GA 12). */
        #preview .lbg-r3-school label,
        #preview .ga-label{
          display:inline-flex!important;
          align-items:center!important;
          justify-content:center!important;
          gap:5px!important;
          white-space:nowrap!important;
          font-weight:800!important;
        }

        #preview .lbg-r3-ga,
        #preview .ga-input{
          width:58px!important;
          min-width:58px!important;
          max-width:58px!important;
          height:36px!important;
          min-height:36px!important;
          padding:0 8px!important;
          box-sizing:border-box!important;
          border:1.5px solid #d9bda8!important;
          border-radius:10px!important;
          background:#fff!important;
          color:#5b3828!important;
          text-align:center!important;
          font-family:"Times New Roman",serif!important;
          font-size:17px!important;
          font-weight:800!important;
          line-height:34px!important;
          font-variant-numeric:tabular-nums!important;
          appearance:textfield!important;
          -moz-appearance:textfield!important;
          box-shadow:0 1px 2px rgba(91,56,40,.06)!important;
        }

        #preview .lbg-r3-ga::-webkit-outer-spin-button,
        #preview .lbg-r3-ga::-webkit-inner-spin-button,
        #preview .ga-input::-webkit-outer-spin-button,
        #preview .ga-input::-webkit-inner-spin-button{
          -webkit-appearance:none!important;
          margin:0!important;
        }

        #preview .lbg-r3-ga:focus,
        #preview .ga-input:focus{
          outline:none!important;
          border-color:#f4a261!important;
          box-shadow:0 0 0 3px rgba(244,162,97,.22)!important;
        }

        #preview .lbg-r3-ga::placeholder,
        #preview .ga-input::placeholder{
          color:#a98a76!important;
          opacity:.72!important;
          font-size:15px!important;
          font-weight:700!important;
        }

        @media(max-width:620px){
          #preview .lbg-r3-ga,
          #preview .ga-input{
            width:56px!important;
            min-width:56px!important;
            max-width:56px!important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  mount();
  document.addEventListener('lbg-access-ready',mount);
  window.addEventListener('focus',mount);
  window.LBGGaInputVisualFixV1={version:VERSION};
})();
