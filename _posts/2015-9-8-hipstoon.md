---
layout: post
title: 힙스툰 개발기
comments: true
share: true
tags: [개발, 웹서비스]
---
<p class="meta">2015년 9월 8일</p>

<p style="text-align:center;" >
<a href="http://hipstoon.com"><img style="display: block;margin: 0 auto;" src="/images/hipstoon-logo.png">
hipstoon.com
</a>
</p>

힙스툰은 웹툰을 많이보는 여자친구가 이야기했던 내용을 바탕으로 만들게 되었다. 불편한 점, 필요한 기능 많이 이야기했는데 첫 버전은 아주 단순하게 웹툰 보면서 댓글 다는 [크롬 확장기능](https://chrome.google.com/webstore/detail/hipstoon/knmlmiphdmpinefnobimbhdhecioflid)과 최근 본 웹툰 기록, 자유게시판 이거 세가지 기능만 구현했다. 

![힙스툰](/images/hipstoon1.png)
(웹툰을 볼 때 자동으로 열린다. 옵션에서 자동 열림을 끌 수도 있다.)

크롬 확장기능이 댓글을 저장하는 Meteor 서버와 통신하기 위해  [Asteroid](https://github.com/mondora/asteroid)라는 라이브러리를 사용했는데 어떤 자바스크립트 앱에서도 Meteor 서버와 ddp(Meteor  데이터 프로토콜) 연결을 도와주는 편리한 도구다. 크롬 확장기능을 위한 안내도 있어 쉽게 사용할 수 있다. 

[hipstoon.com](http://hipstoon.com)은 [헬조선 뉴스](http://hellchosun.news) 소스에 기반을 두고있다. 앞으로도 헬조선뉴스는 다른 앱을 만들때 밑바탕이 될 수 있도록 꾸준히 유지보수 할 계획이다. 

마지막으로 소개할 도구는 Yeoman - [크롬 확장기능 생성기](https://github.com/yeoman/generator-chrome-extension)이다. Yeoman을 웹개발을 쉽게 만들어주는 보조 도구인데 크롬 확장기능을 만들 때 필요한 파일과 설정을 알아서 해주고 다 만든다음엔 grunt로 test, build까지 해준다. 

주말 벌초 일정으로 많은 테스트를 못해보고 공개하게 되었는데 분명히 치명적인 문제가 숨어있을거라 생각한다.  버그신고는 yourfriends@hipstoon.com 

로고는 여자친구가 잠시 임시보호했던 고양이를 보고 내가 그린 것이다. 

![바둑이](/images/badoogi.jpg)