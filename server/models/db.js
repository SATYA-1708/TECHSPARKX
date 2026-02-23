const Datastore = require('nedb-promises');
const path = require('path');

const users = Datastore.create(path.join(__dirname, '../data/users.db'));
const projects = Datastore.create(path.join(__dirname, '../data/projects.db'));
const messages = Datastore.create(path.join(__dirname, '../data/messages.db'));
const escrows = Datastore.create(path.join(__dirname, '../data/escrows.db'));
const referrals = Datastore.create(path.join(__dirname, '../data/referrals.db'));
const reviews = Datastore.create(path.join(__dirname, '../data/reviews.db'));

// Ensure compacting or autoload if needed (nedb-promises does autoload created from path)

module.exports = {
    users,
    projects,
    messages,
    escrows,
    referrals,
    reviews
};
