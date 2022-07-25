const person = {
  name: 'moustacheHu',
  age: 18,
  desc: 'eighteen forever'
};

const cloneFunc = (per, attributes) => {
  return {
    ...per,
    ...attributes
  };
};

const clonePerson = cloneFunc(person, { name: 'cloned m' });

console.log(person?.height);

export default clonePerson;