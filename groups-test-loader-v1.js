'use strict';
(function(){
  let tries=0;
  function add(src,id,onload){
    if(document.getElementById(id)){onload?.();return}
    const s=document.createElement('script');s.id=id;s.src=src;s.async=false;if(onload)s.onload=onload;document.body.appendChild(s);
  }
  const timer=setInterval(()=>{
    tries++;
    if(window.LBGAuth){
      clearInterval(timer);
      add('access-control-v1.js?v=20260804.1','lbgAccessControlV1',()=>add('group-management-v1.js?v=20260804.1','lbgGroupManagementV1'));
    }else if(tries>300){
      clearInterval(timer);
      console.error('Không tải được mô-đun nhóm vì hệ thống đăng nhập chưa sẵn sàng.');
    }
  },100);
})();
