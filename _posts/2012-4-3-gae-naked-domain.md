---
layout: post
title:  구글 앱 엔진 naked domain 사용하기 
---

{{ page.title }}
================

<p class="meta">2012년 4월 3일 - 잠원동</p>
![architecture 101](/images/google-apps-naked-domain.png)

[구글 앱 엔진](https://developers.google.com/appengine/?hl=ko)으로 만든 app은 http://example.com 같은 기본 도메인(naked domain)을 사용할 수 없고 http://www.example.com 같이 서브도메인만 연결 시킬 수 있다. 하지만 [구글 앱스](http://www.google.com/apps/)에서 기본도메인 리디렉션 기능을 사용하면 기본 도메인과 구글 앱 엔진용 서브 도메인을 연결 시킬 수 있다. 기능을 활성화 한 다음 시키는 대로 도메인 관리 사이트에서 A 레코드만 입력해주면 된다. (몇시간 기다려야 완전히 적용)

더 좋은 점은 하위 경로까지 포워딩 되기 때문에 http://example.com/blog/2012/04/03 같은 주소를 입력하면 http://www.example.com/blog/2012/04/03 으로 연결 시켜준다는 점이다! 