import { Table, Column, Model, DataType, HasMany, BeforeCreate } from 'sequelize-typescript';
import bcrypt from 'bcryptjs';
import Blog from './Blog';
import { EUserRole } from '@/core/Enumers';

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
    type: DataType.ENUM('active','inactive','banned','pending'),
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

  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
  }
}

export default User;
