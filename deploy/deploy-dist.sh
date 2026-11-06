#!/usr/bin/env bash
# 解压 dist 包 → 替换站点根目录 → 校验并重载 nginx。
# 用法：bash deploy-dist.sh monitor-frontend-dist-<tag>.tar.gz
#
# 可用环境变量覆盖：
#   WEB_ROOT（默认 /opt/monitor-frontend）、NGINX_SERVICE（默认 nginx）、RESTART（1 时 restart）
set -euo pipefail

ARCHIVE=${1:-}
if [[ -z "$ARCHIVE" ]]; then
  echo "用法: bash $0 monitor-frontend-dist-<tag>.tar.gz" >&2
  exit 1
fi
if [[ ! -f "$ARCHIVE" ]]; then
  echo "找不到 dist 包: $ARCHIVE" >&2
  exit 1
fi

WEB_ROOT=${WEB_ROOT:-/opt/monitor-frontend}
NGINX_SERVICE=${NGINX_SERVICE:-nginx}
RESTART=${RESTART:-0}

command -v tar >/dev/null 2>&1 || { echo '找不到 tar' >&2; exit 1; }
command -v nginx >/dev/null 2>&1 || { echo '找不到 nginx' >&2; exit 1; }

newdir="$WEB_ROOT/dist.new"
olddir="$WEB_ROOT/dist.old"

rm -rf "$newdir" "$olddir"
mkdir -p "$newdir"

echo "[1/3] 解压 $ARCHIVE ..."
tar -xzf "$ARCHIVE" -C "$newdir"
if [[ ! -f "$newdir/index.html" ]]; then
  echo '压缩包内缺少 index.html，请确认使用的是 build-dist.ps1 的产物。' >&2
  exit 1
fi
chmod -R a+rX "$newdir"

echo '[2/3] 切换静态目录 ...'
if [[ -d "$WEB_ROOT/dist" ]]; then
  mv "$WEB_ROOT/dist" "$olddir"
fi
mv "$newdir" "$WEB_ROOT/dist"
rm -rf "$olddir"

echo '[3/3] 校验并重载 nginx ...'
if ! grep -Rqs "$WEB_ROOT/dist" /etc/nginx/conf.d/monitor-frontend.conf; then
  echo "警告：/etc/nginx/conf.d/monitor-frontend.conf 的 root 可能不是 $WEB_ROOT/dist，请确认。" >&2
fi

nginx -t
if [[ "$RESTART" == '1' ]]; then
  systemctl restart "$NGINX_SERVICE"
else
  systemctl reload "$NGINX_SERVICE" || systemctl restart "$NGINX_SERVICE"
fi

echo
echo "部署完成: $WEB_ROOT/dist"
echo "  首页(80):   curl -I http://<域名>/"
echo "  首页(443):  curl -I https://<域名>/"
echo '  路由回退:   curl -o /dev/null -w "%{http_code}\n" https://<域名>/errors'
echo "  首页(8888): curl -k -I https://<域名>:8888/"
echo '  接口:       curl -s https://<域名>/api/v1/dashboard/apps -H "Authorization: Bearer <token>"'
echo "  回滚: 重新上传旧版本 dist 包并执行本脚本。"
