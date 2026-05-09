import math

def check_password_strength(password):
    """简单评估密码强度"""
    length = len(password)
    char_sets = 0
    
    if any(c.islower() for c in password): char_sets += 26
    if any(c.isupper() for c in password): char_sets += 26
    if any(c.isdigit() for c in password): char_sets += 10
    if any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in password): char_sets += 32
    
    if char_sets == 0:
        entropy = 0
    else:
        entropy = length * math.log2(char_sets)
    
    print(f"密钥长度: {length}")
    print(f"字符集大小: {char_sets}")
    print(f"信息熵: {entropy:.1f} bits")
    
    if entropy < 60:
        print("⚠️ 强度: 弱 - 建议使用更复杂的密钥")
    elif entropy < 80:
        print("✅ 强度: 中 - 可以接受")
    else:
        print("💪 强度: 强 - 很好！")

# 测试你的密钥
check_password_strength("8x!fR9#pL2mN$qK5vH7jW4yZ6tA3cE1uB8dG5sH9jW2kL4nQ7")