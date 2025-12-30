# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

GitHub Pages에서 호스팅되는 Jekyll 기반 개인 블로그 (plan9.kr / sungchi.github.io)

## 환경 설정

Ruby 3.1.6 필요 (rbenv으로 관리, `.ruby-version` 파일 참조)

```bash
# rbenv 초기화 (쉘 설정에 추가 권장)
eval "$(rbenv init -)"

# 또는 직접 경로 지정
export PATH="$HOME/.rbenv/versions/3.1.6/bin:$PATH"
```

## 명령어

```bash
# 의존성 설치
bundle install

# 로컬 개발 서버 실행 (http://localhost:4000)
bundle exec jekyll serve

# 정적 사이트 빌드
bundle exec jekyll build
```

## 구조

- **_posts/**: `YYYY-M-D-title.md` 형식의 블로그 포스트
- **_layouts/**: 페이지 템플릿 (default → home/post/page 계층)
- **_includes/**: 재사용 HTML 파셜 (head, header, footer, disqus_comments, google-analytics, social)
- **_config.yml**: 사이트 설정 (변경 시 서버 재시작 필요)

## 블로그 포스트 작성

포스트는 YAML frontmatter 필요:
```yaml
---
layout: post
title: 포스트 제목
comments: true      # 선택 - Disqus 댓글 활성화
share: true         # 선택
tags: [태그1, 태그2] # 선택
description: ...    # 선택 - meta description 및 og:description에 사용
feature: image.png  # 선택 - /images/ 경로의 og:image
---
```

## 스타일

CSS는 `_includes/head.html`에 인라인으로 작성되어 있으며, `prefers-color-scheme`으로 다크모드 자동 지원
