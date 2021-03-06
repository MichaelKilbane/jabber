import bcrypt from 'bcrypt';
import config from 'config';
import jwt from 'jsonwebtoken';
import HttpException from '@exceptions/HttpException';
import { DataStoredInToken, TokenData } from '@interfaces/auth.interface';
import { User, UserType } from '@interfaces/users.interface';
import userModel from '@models/users.model';
import { isEmpty } from '@utils/util';
import { LoginDto, SignupDto } from '@dtos/auth.dto';

class AuthService {
  public users = userModel;

  public async hydrate(userData: User): Promise<{ cookie: string; findUser: User }> {
    if (isEmpty(userData)) throw new HttpException(400, "You're not userData");

    const findUser: User = await this.users.findOne({
      email: userData.email,
      password: userData.password,
    });

    if (!findUser)
      throw new HttpException(409, `You're email ${userData.email} not found`);

    const tokenData = this.createToken(findUser);
    const cookie = this.createCookie(tokenData);

    return { cookie, findUser };
  }

  public async signup(userData: SignupDto): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, "You're not userData");

    const { email, password, firstName, lastName, dateOfBirth, type } = userData;

    if (type === UserType.SUPER_ADMIN || type === UserType.VACCINE_ADMIN)
      throw new HttpException(405, 'This user type cannot be used in sign up');

    const findUser: User = await this.users.findOne({ email });
    if (findUser) throw new HttpException(409, `You're email ${email} already exists`);

    const hashedPassword = await bcrypt.hash(password, 10);
    const createUserData: User = await this.users.create({
      email,
      password: hashedPassword,
      type,
      active: true,
      userDetails: {
        firstName,
        lastName,
        dateOfBirth,
      },
    });

    return createUserData;
  }

  public async login(userData: LoginDto): Promise<{ cookie: string; findUser: User }> {
    if (isEmpty(userData)) throw new HttpException(400, "You're not userData");

    const findUser: User = await this.users.findOne({ email: userData.email });
    if (!findUser)
      throw new HttpException(409, `You're email ${userData.email} not found`);

    const isPasswordMatching: boolean = await bcrypt.compare(
      userData.password,
      findUser.password,
    );
    if (!isPasswordMatching) throw new HttpException(409, "You're password not matching");

    const tokenData = this.createToken(findUser);
    const cookie = this.createCookie(tokenData);

    return { cookie, findUser };
  }

  public async logout(userData: User): Promise<User> {
    if (isEmpty(userData)) throw new HttpException(400, "You're not userData");

    const findUser: User = await this.users.findOne({
      email: userData.email,
      password: userData.password,
    });
    if (!findUser)
      throw new HttpException(409, `You're email ${userData.email} not found`);

    return findUser;
  }

  public createToken(user: User): TokenData {
    const dataStoredInToken: DataStoredInToken = { _id: user._id };
    const secret: string = process.env.API_SECRET;
    const expiresIn: number = 60 * 60;

    return { expiresIn, token: jwt.sign(dataStoredInToken, secret, { expiresIn }) };
  }

  public createCookie(tokenData: TokenData): string {
    return `Authorization=${tokenData.token}; Path=/; HttpOnly; Max-Age=${tokenData.expiresIn};`;
  }
}

export default AuthService;
