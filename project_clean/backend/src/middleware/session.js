const session = require("express-session");
const connectMongo = require("connect-mongo");

const storeOptions = {
  mongoUrl: process.env.MONGO_URL,
  url: process.env.MONGO_URL,
  dbName: "test",
  collectionName: "sessions",
  ttl: 60 * 60,
  autoRemove: "native",
};

let store;
try {
  if (connectMongo && typeof connectMongo.create === "function") {
    store = connectMongo.create(storeOptions);
  }
  
  else if (connectMongo && connectMongo.default && typeof connectMongo.default.create === "function") {
    store = connectMongo.default.create(storeOptions);
  }
  
  else if (typeof connectMongo === "function") {
    const MongoStoreFactory = connectMongo(session);
    store = new MongoStoreFactory(storeOptions);
  }
  
  else if (connectMongo && typeof connectMongo.default === "function") {
    const MongoStoreFactory = connectMongo.default(session);
    store = new MongoStoreFactory(storeOptions);
  }
  else {
    throw new Error(
      "Unsupported connect-mongo module shape. Ensure connect-mongo is installed (v3 or v4+) and not an incompatible package."
    );
  }
} catch (err) {
  throw new Error("Failed to create session store (connect-mongo): " + err.message);
}

const sessionMiddleware = session({
  name: "medium.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store,
  cookie: {
    maxAge: 1000 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
});

module.exports = sessionMiddleware;
