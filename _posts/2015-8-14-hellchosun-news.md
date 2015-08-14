---
layout: post
title: 헬조선뉴스 개발기  
comments: true
share: true
tags: [개발, 웹서비스]
---
<p class="meta">2015년 8월 14일</p>

새 프로젝트를 준비하면서 구글이 정식으로 발표한 [Material Design Lite](http://www.getmdl.io/) (이하 MDL)를 테스트해보고 Meteor 앱을 만들때 사용할 초기 템플렛을 만들어 볼 생각으로 작은 앱을 생각해봤는데 그 중 적당하다고 생각한 것이 한국의 비이성적인 뉴스들을 보으는 [헬조선뉴스](http://hellchosun.news/guide)였다.

MDL에서 자바스크립트를 이용한 기능들은 [Meteor](https://www.meteor.com/) + [Iron Router](https://github.com/iron-meteor/iron-router)에서 버그가 있다. 그걸 처리하기 위해 패치된 버전이 있지만 그것도 완전하지 않아서 화면이 render 될 때마다 MDL 라이브러리를 깨워주는(?) 코드를 한 줄 넣은게 마음에 걸린다. 업데이트 안된지 오래된 Iron Router에 대해 말이 많지만 제작자가 Meteor 개발팀과 뭔가 협업 중이라는 [말](https://github.com/iron-meteor/iron-router/issues/1348#issuecomment-107747961)을 믿고 채택했다.

레이아웃은 기본적으로 [flexbox](https://gist.github.com/jayj/4012969)를 사용하기로했다. 비록 -webkit-, -moz-, -ms- 같은 Vendor Prefix 때문에 [LESS mixin](https://gist.github.com/jayj/4012969)을 써야하지만 그 간편함과 강력한 성능은 너무 사랑스럽다.

싱글 페이지 애플리케이션 형태인 Meteor에서 글 목록을 무한 스크롤 방식으로 보여줄 땐 다른 페이지에 갔다 오게 되면 글목록 위치와 개수가 초기화 되도록 만드는게 보통이었는데 이번에는 [SubsManager](https://github.com/meteorhacks/subs-manager/)라는 패키지를 활용해 사용자가 읽고 있던 글 목록의 개수와 스크롤 위치를 저장하도록 했다. 아직 특별한 부작용은 없다.

링크 콘텐츠 미리보기 기능은 [Embedly Card](http://embed.ly/cards)를 이용해 만들었다. embedly 외부 라이브러리가 link를 카드 모양으로 바꿔주는 방식인데 국내 사이트도 꽤 잘 동작하는 편이라 감사한 마음으로 적용했다.  

간략하게(=불친절하게)나마 생각나는 주요 개발 내용을 적어보았다. 1년도 넘은 지난 포스팅에서 마지막 내용이 meteor.js 공부를 시작했다는 내용이었는데 감회가 새롭다.
