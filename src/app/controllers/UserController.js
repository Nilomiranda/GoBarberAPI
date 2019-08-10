import * as Yup from 'yup';
import User from '../models/User';

class UserController {
  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string().email().required(),
      password: Yup.string().min(6).required(),
      provider: Yup.string(),
    });

    const user = req.body;


    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    // check if email provided is already under use
    const userExists = await User.findOne({ where: { email: user.email } });

    if (userExists) {
      return res.status(400).send({ error: 'Email already under use' });
    }

    const {
      id, name, email, provider,
    } = await User.create(user);

    return res.send({
      id, name, email, provider,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string(),
      email: Yup.string().email(),
      oldPassword: Yup.string().min(6),
      password: Yup.string()
        .min(6)
        .when('oldPassword', (oldPassword, field) => (oldPassword ? field.required() : field)),
      confirmPassword: Yup.string()
        .when('password', (password, field) => (
          password ? field.required().oneOf([Yup.ref('password')]) : field
        )),

    });

    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation failed' });
    }

    const { oldPassword } = req.body;

    const user = await User.findByPk(req.userId);

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(401).json({ error: 'The current password you informed is incorrect' });
    }

    const {
      id, name, email, provider,
    } = await user.update(req.body);

    return res.status(200).json({
      id, name, email, provider,
    });
  }
}

export default new UserController();
