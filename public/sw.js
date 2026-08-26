self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));

self.addEventListener('push',event=>{
  let data={title:'AVA',body:'Neue Benachrichtigung',url:'/'};
  try{if(event.data)data={...data,...event.data.json()}}catch(_e){}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body,
    icon:'/icon-192.svg',
    badge:'/icon-192.svg',
    tag:data.tag||'ava-push',
    data:{url:data.url||'/'}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'/';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){
      if('focus' in client){client.navigate(target);return client.focus();}
    }
    if(self.clients.openWindow)return self.clients.openWindow(target);
  }));
});
