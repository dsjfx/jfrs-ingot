import { Table, Column, Model, DataType, HasMany, BeforeCreate } from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import Blog from './Blog';
import { EUserRole } from '@/core/Enumers';
import { UserProfile } from '@/types';

@Table({
  tableName: 'ingot_user',
  timestamps: true,
  paranoid: true,
})
class User extends Model {
  @Column({
    type: DataType.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  })
  id!: number;

  @Column({
    type: DataType.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
    },
  })
  username!: string;

  @Column({
    type: DataType.STRING(50),
    allowNull: true,
    validate: {
      len: [3, 50],
    },
  })
  nickname?: string;

  @Column({
    type: DataType.STRING(60),
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataType.ENUM('active', 'inactive', 'banned', 'pending'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  })
  email!: string;

  @Column({
    type: DataType.ENUM('admin', 'editor', 'visitor', 'user'),
    defaultValue: 'visitor',
  })
  role!: `${EUserRole}`;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  avatar?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    validate: {
      is: /^1[3-9]\d{9}$/,
    },
  })
  phone?: string;

  @Column({
    type: DataType.ENUM('male', 'female', 'secret'),
    defaultValue: 'secret',
  })
  gender?: string;

  @Column({
    type: DataType.DATEONLY,
    allowNull: true,
  })
  birthday?: Date;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  bio?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
  })
  location?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    get() {
      const value = this.getDataValue('hobbies');
      return value ? value.split(',') : [];
    },
    set(value: string[] | string) {
      if (Array.isArray(value)) {
        this.setDataValue('hobbies', value.join(','));
      } else {
        this.setDataValue('hobbies', value);
      }
    },
  })
  hobbies?: string[];

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    validate: {
      isUrl: true,
    },
  })
  github?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    validate: {
      isUrl: true,
    },
  })
  weibo?: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    validate: {
      is: /^[1-9]\d{4,11}$/,
    },
  })
  zhihu?: string;

  @Column({
    type: DataType.STRING(200),
    allowNull: true,
    validate: {
      isUrl: true,
    },
  })
  website?: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
  })
  motto?: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  job?: string;

  // 获取年龄（根据生日计算）
  get age(): number | null {
    if (!this.birthday) return null;
    const today = new Date();
    const birthDate = new Date(this.birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // 获取生日格式化的字符串
  get formattedBirthday(): string | null {
    if (!this.birthday) return null;
    const date = new Date(this.birthday);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  @HasMany(() => Blog, { foreignKey: 'authorId' })
  blogs!: Blog[];

  @BeforeCreate
  static async hashPassword(user: User) {
    if (user.password) {
      // 检查是否已经是bcrypt hash
      const isAlreadyHashed = user.password.startsWith('$2b$') && user.password.length === 60;

      if (!isAlreadyHashed) {
        // 只有明文密码才需要加密
        user.password = await bcrypt.hash(user.password, 10);
      } else {
        console.log('密码已经是hash格式，跳过加密');
      }
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // 获取完整的用户资料（排除敏感信息）
  getProfile(): UserProfile {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      role: this.role,
      avatar: this.avatar,
      phone: this.phone,
      gender: this.gender,
      birthday: this.birthday,
      bio: this.bio,
      location: this.location,
      hobbies: this.hobbies,
      github: this.github,
      weibo: this.weibo,
      zhihu: this.zhihu,
      website: this.website,
      motto: this.motto,
      job: this.job,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  }
}

export default User;
