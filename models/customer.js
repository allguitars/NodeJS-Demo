const mongoose = require('mongoose');
const Joi = require('joi');

const Customer = mongoose.model('Customer', new mongoose.Schema({
    isGold: {
        type: Boolean,
        default: false
    },
    name: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 50
    },
    phone: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 30
    }
}));

// Validate user's input
function validateCustomer(body) {

    const schema = {
        name: Joi.string().min(3).max(50).required(),
        phone: Joi.string().min(5).max(50).required(),
        isGold: Joi.boolean()
    };

    return Joi.validate(body, schema);
}

exports.Customer = Customer;
exports.validate = validateCustomer;
