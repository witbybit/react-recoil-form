export const isValidEmail = (email: string) => {
  const emailRegExp =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegExp.test(email);
};

export const isValidPhone = (phone: string) => {
  const phoneRegExp =
    /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  return phoneRegExp.test(phone);
};

export const countryOptions = [
  {
    label: 'India',
    value: 'IND',
  },
  {
    label: 'France',
    value: 'FR',
  },
  {
    label: 'Japan',
    value: 'JPN',
  },
  {
    label: 'America',
    value: 'USA',
  },
];

export const genderOptions = [
  {
    label: 'Female',
    value: 'female',
  },
  {
    label: 'Male',
    value: 'male',
  },
  {
    label: 'Other',
    value: 'other',
  },
];

export const jobOptions = [
  {
    label: 'Frontend',
    value: 'frontend',
  },
  {
    label: 'Backend',
    value: 'backend',
  },
  {
    label: 'Full Stack',
    value: 'fullstack',
  },
];
