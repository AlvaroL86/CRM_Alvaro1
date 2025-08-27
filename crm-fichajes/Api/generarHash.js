const bcrypt = require('bcryptjs');

const password = '1234';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Nuevo hash:', hash);
});
