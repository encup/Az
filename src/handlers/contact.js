import { store, eventBus } from '../store.js';

function handleContactsUpdate(contacts) {
    contacts.forEach(contact => {
        store.contacts[contact.id] = contact;
    });
    eventBus.emit('contactsUpdated', store.contacts);
}

export { handleContactsUpdate };
