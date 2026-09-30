const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Event = require('./models/Event');

// Always load this server's .env, regardless of the folder used to run the script.
dotenv.config({ path: path.join(__dirname, '.env') });

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

const sampleEvents = [
    {
        title: 'React & Node.js Developer Retreat',
        description: 'A hands-on gathering for developers to learn modern full-stack web development and meet the community.',
        date: daysFromNow(10),
        location: 'Innovation Center, Mumbai',
        category: 'Technology',
        totalSeats: 200,
        ticketPrice: 0,
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Neon Nights Music Festival',
        description: 'An evening of live electronic music, energetic performances, and spectacular light shows.',
        date: daysFromNow(20),
        location: 'Grand Arena, Mumbai',
        category: 'Music',
        totalSeats: 500,
        ticketPrice: 1500,
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Global Business & Startup Summit',
        description: 'Founders, business leaders, and investors share ideas on entrepreneurship and the future of technology.',
        date: daysFromNow(15),
        location: 'Convention Centre, New Delhi',
        category: 'Business',
        totalSeats: 150,
        ticketPrice: 500,
        image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Contemporary Art Exhibition',
        description: 'Explore contemporary art and discover new work from emerging artists.',
        date: daysFromNow(5),
        location: 'City Art Museum, Jaipur',
        category: 'Art',
        totalSeats: 300,
        ticketPrice: 200,
        image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Startup Pitch Competition',
        description: 'Watch early-stage teams present their ideas and connect with the startup community.',
        date: daysFromNow(30),
        location: 'Convention Centre, Bengaluru',
        category: 'Business',
        totalSeats: 250,
        ticketPrice: 100,
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800'
    },
    {
        title: 'Cloud Computing Architecture Seminar',
        description: 'A practical seminar on scalable cloud services, deployment, and modern application architecture.',
        date: daysFromNow(12),
        location: 'Technology Hub, Hyderabad',
        category: 'Technology',
        totalSeats: 100,
        ticketPrice: 600,
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800'
    }
];

async function seedEvents() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI is missing from server/.env; refusing to use a fallback database.');
    }
    const databaseName = uri.match(/\.net\/([^/?]+)/i)?.[1] || uri.match(/:\d+\/([^/?]+)/)?.[1];
    if (databaseName !== 'eventora') {
        throw new Error('MONGO_URI must point to the Eventora database (/eventora); no data was changed.');
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('Connected to the Eventora database.');

    // createdBy is optional in the Event model. Link a real existing account if available.
    const creator = await User.findOne({ role: 'admin' }).select('_id') || await User.findOne().select('_id');
    let added = 0;
    let alreadyPresent = 0;

    for (const sample of sampleEvents) {
        const existing = await Event.findOne({ title: new RegExp(`^${sample.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('_id');
        if (existing) {
            alreadyPresent += 1;
            continue;
        }

        await Event.create({
            ...sample,
            availableSeats: sample.totalSeats,
            ...(creator ? { createdBy: creator._id } : {})
        });
        added += 1;
    }

    const total = await Event.countDocuments();
    console.log(`Added ${added} sample event(s); ${alreadyPresent} matching event(s) already existed.`);
    console.log(`Event collection now has ${total} event(s). Existing users, events, and bookings were not deleted or overwritten.`);
}

seedEvents()
    .catch((error) => {
        console.error('Could not safely seed events:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect().catch(() => {});
    });
