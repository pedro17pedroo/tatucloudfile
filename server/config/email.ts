export const emailConfig = {
  connection: 'smtp',
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'pedro17pedroo@gmail.com',
      pass: 'thoybdhvxwdrzofy'
    }
  },
  from: 'pedro17pedroo@gmail.com',
  fromName: 'MEGA File Manager'
};