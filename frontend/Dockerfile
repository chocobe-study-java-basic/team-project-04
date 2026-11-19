FROM node:26-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 공개 설정은 정적 파일을 만들 때 고정됩니다. 비밀번호나 서버용 키는 전달하지 않습니다.
ARG NEXT_PUBLIC_API_BASE_URL=/
ARG NEXT_PUBLIC_KAKAO_MAP_JS_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_KAKAO_MAP_JS_KEY=${NEXT_PUBLIC_KAKAO_MAP_JS_KEY}
RUN npm run build

FROM nginx:stable-alpine

COPY --from=build /app/out/ /usr/share/nginx/html/
# Backend 전달 설정은 compose.deploy.yaml이 nginx/default.conf를 연결합니다.
EXPOSE 80
