import{b as x,c as y,d as S,e as f,r as i,_ as j,f as a,j as e,M as w,g,O as k,S as M,h as O}from"./components-Bfy28bxK.js";/**
 * @remix-run/react v2.17.4
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */let l="positions";function R({getKey:r,...c}){let{isSpaMode:u}=x(),o=y(),d=S();f({getKey:r,storageKey:l});let h=i.useMemo(()=>{if(!r)return null;let t=r(o,d);return t!==o.key?t:null},[]);if(u)return null;let p=((t,m)=>{if(!window.history.state||!window.history.state.key){let s=Math.random().toString(32).slice(2);window.history.replaceState({key:s},"")}try{let n=JSON.parse(sessionStorage.getItem(t)||"{}")[m||window.history.state.key];typeof n=="number"&&window.scrollTo(0,n)}catch(s){console.error(s),sessionStorage.removeItem(t)}}).toString();return i.createElement("script",j({},c,{suppressHydrationWarning:!0,dangerouslySetInnerHTML:{__html:`(${p})(${a(JSON.stringify(l))}, ${a(JSON.stringify(h))})`}}))}const _="/assets/app-Gae4Zin_.css",L=()=>[{rel:"stylesheet",href:_}];function b(){return e.jsxs("html",{lang:"en",children:[e.jsxs("head",{children:[e.jsx("meta",{charSet:"utf-8"}),e.jsx("meta",{name:"viewport",content:"width=device-width,initial-scale=1"}),e.jsx(w,{}),e.jsx(g,{})]}),e.jsxs("body",{children:[e.jsx(k,{}),e.jsx(R,{}),e.jsx(M,{}),e.jsx(O,{})]})]})}export{b as default,L as links};
