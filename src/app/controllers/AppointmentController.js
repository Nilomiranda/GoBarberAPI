import * as Yup from 'yup';
import {
  startOfHour, isBefore, parseISO, format, subHours,
} from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';
import File from '../models/File';
import Notification from '../schemas/notification';

import Mail from '../../lib/mail';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20,
      attributes: ['id', 'date'],
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['url', 'id', 'path'],
            },
          ],
        },
      ],
    });

    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ message: 'Validation failed' });
    }

    const { provider_id, date } = req.body;

    /**
     * Check if provider id is a provider
     */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res.status(401).json({ error: 'You can only create appointments with providers' });
    }

    if (req.userId === provider_id) {
      return res.status(400).json({ error: 'Providers can not create appointments with themselves' });
    }

    const hourStart = startOfHour(parseISO(date));

    /**
     * checking past dates
     */
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not permitted' });
    }

    /**
     * checking date availability
     */
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailability) {
      return res.status(400).json({ error: 'The chosen date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    /**
     * Notify provider about new appointment
     */
    const user = await User.findByPk(req.userId);
    const formatedDate = format(
      hourStart,
      "MMMM, dd' at: 'H:mm",
    );

    await Notification.create({
      content: `New appointment from ${user.name} set to ${formatedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }


  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({ error: "You don't have permission to cancel this appointment" });
    }

    const dateWithSub = subHours(appointment.date, 2);

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({ error: 'You can only cancel appointments two hours in advance' });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Mail.sendMail({
      to: `${appointment.provider.name} <${appointment.provider.email}>`,
      subject: 'Appointment canceled',
      template: 'cancellation',
      context: {
        provider: appointment.provider.name,
        user: appointment.user.name,
        date: format(
          appointment.date,
          "MMMM, dd' at: 'H:mm",
        ),
      },
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
