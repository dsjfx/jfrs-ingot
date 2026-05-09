#!/bin/bash

# 为每个模型创建迁移
# npx sequelize-cli migration:generate --name create-users
# npx sequelize-cli migration:generate --name create-categories
# npx sequelize-cli migration:generate --name create-tags
# npx sequelize-cli migration:generate --name create-blogs
# npx sequelize-cli migration:generate --name create-comments
# npx sequelize-cli migration:generate --name create-blog-tags
#
## 在项目的根目录下运行此脚本
## ./scripts/db_migrate

# 颜色定义
RED='\033[0;31m'				# Red
GREEN='\033[0;32m'		# Green
YELLOW='\033[1;33m'		# Yellow
NC='\033[0m' 						# No Color

# 显示使用方法
show_usage() {
	echo -e "${YELLOW}使用方法：${NC}"
	echo "		$0 <迁移文件名>"
	echo ""
	echo -e "${YELLOW}示例：${NC}"
	echo "		$0 create-blog"
	echo "		$0 add-user-email"
	echo "		$0 modify-post-table"
	echo ""
	echo -e "${YELLOW}生成的迁移文件将保存在：${NC} migrations/ 目录下"
}

# 检查参数
if [ $# -eq 0 ]; then
	echo -e "${RED}❌ 错误：请提供迁移文件名${NC}"
	show_usage
	exit 1
fi

if [ $# -gt 1 ]; then
	echo -e "${RED}❌ 错误：参数太多${NC}"
	show_usage
	exit 1
fi

MIGRATION_NAME="$1"

# 验证迁移文件名格式（只能包含字母、数字和连字符）
if [[ "$MIGRATION_NAME" =~ ^[a-zA-Z0-9]+$ ]]; then
	echo -e "${RED}❌ 错误：迁移文件名只能包含字母、数字和连字符${NC}"
	echo "例如: create-blog, add-user-email, modify-post-table"
	exit 1
fi

echo -e "${GREEN}🚀 正在生成迁移文件: ${MIGRATION_NAME}${NC}"

# # 检查是否在项目根目录（检查是否有 package.json 和 migrations 目录）
# if [ ! -f "package.json" ]; then
# 	echo -e "${YELLOW}⚠️ 警告：当前目录下没有找到 package.json 文件${NC}"
# 	read -p "是否继续？(y/n): " -n  -r
# 	echo
# 	if [[ ! $REPLY =~ ^[Yy]$ ]]; then
# 		exit 1
# 	fi
# fi

# # 确保 migrations 目录存在
# if [ ! -d "migrations" ]; then
# 	echo -e "${YELLOW}📁 正在创建 migrations 目录...${NC}"
# 	mkdir -p migrations
# fi

# 执行迁移文件生成命令
if command -v npx &> /dev/null; then 
	npx sequelize-cli migration:generate --name "$MIGRATION_NAME"
	RESULT=$?
else
	echo -e "${RED}❌ 错误：未找到 npx 命令${NC}"
	echo "请确保已安装 Node.js 和 npm"
    exit 1
fi

# 检查结果
if [ $RESULT -eq 0 ]; then
	echo -e "${GREEN}✅ 迁移文件生成成功！${NC}"

	# 显示最新生成的迁移文件
	LATEST_MIGRATION=$(ls -t migrations/*.js 2>/dev/null | head -n1)
	if [ -n "$LATEST_MIGRATION" ]; then
		echo -e "${GREEN}📄 最新迁移文件: ${LATEST_MIGRATION}${NC}"
	fi
else
	echo -e "${RED}❌ 迁移文件生成失败${NC}"
    echo "请检查:"
    echo "  1. 是否已安装 sequelize-cli (npm install --save-dev sequelize-cli)"
    echo "  2. 是否有正确的数据库配置"
    exit 1
fi