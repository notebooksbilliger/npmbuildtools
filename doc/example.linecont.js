require('@nbb.com/npmbuildtools');

console.info('Line to complete\b');
console.info('\bon next call.');

console.warn('Warning composed\b');
console.warn('\bby more than\b');
console.warn('\btwo calls.');

console.info('Trying to do something ...\b');
if ((Math.random() * 10) >= 5) {
  console.info('\bok.');
} else {
  console.error('\bfailed!');
}
