const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// !------------------- Middleware ------------------------------

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://lost-found-9fc15.web.app",
      "https://lost-found-9fc15.firebaseapp.com",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// !------------------- MongoDB ---------------------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qq6y6.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let LostAndFoundCollection;
let recoveredCollection;
let isMongoConnected = false;

// !------------------- MongoDB Connection ----------------------

async function connectMongoDB() {
  if (isMongoConnected) {
    return;
  }

  try {
    await client.connect();

    const db = client.db("lost-found");

    LostAndFoundCollection = db.collection("data");
    recoveredCollection = db.collection("recovered");

    isMongoConnected = true;

    console.log("MongoDB connected successfully");
  } catch (error) {
    isMongoConnected = false;
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

// !------------------- Root Route -------------------------------

app.get("/", async (req, res) => {
  res.send("Lost-Found server is running");
});

// !------------------- Health Check -----------------------------

app.get("/health", async (req, res) => {
  try {
    await connectMongoDB();

    res.status(200).send({
      success: true,
      message: "Server and MongoDB are working",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "MongoDB connection failed",
      error: error.message,
    });
  }
});

// !------------------- Get All Items ----------------------------

app.get("/allItems", async (req, res) => {
  try {
    await connectMongoDB();

    const result = await LostAndFoundCollection.find({
      status: {
        $nin: ["recovered", "pending"],
      },
    }).toArray();

    res.send(result);
  } catch (error) {
    console.error("Get All Items Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get all items",
      error: error.message,
    });
  }
});

// !------------------- Get Six Items ----------------------------

app.get("/allItems/six", async (req, res) => {
  try {
    await connectMongoDB();

    const result = await LostAndFoundCollection.find({
      status: {
        $nin: ["recovered", "pending"],
      },
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Get Six Items Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get items",
      error: error.message,
    });
  }
});

// !------------------- Add Item --------------------------------

app.post("/addItems", async (req, res) => {
  try {
    await connectMongoDB();

    const newData = req.body;

    newData.status = "active";

    if (!newData.createdAt) {
      newData.createdAt = new Date();
    }

    const result = await LostAndFoundCollection.insertOne(newData);

    res.send(result);
  } catch (error) {
    console.error("Add Item Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to add item",
      error: error.message,
    });
  }
});

// !------------------- Get Single Item --------------------------

app.get("/items/:id", async (req, res) => {
  try {
    await connectMongoDB();

    const id = req.params.id;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid item ID",
      });
    }

    const result = await LostAndFoundCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Item not found",
      });
    }

    res.send(result);
  } catch (error) {
    console.error("Get Single Item Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get item",
      error: error.message,
    });
  }
});

// !------------------- Get My Items By Email --------------------

app.get("/myItem", async (req, res) => {
  try {
    await connectMongoDB();

    const email = req.query.email;

    if (!email) {
      return res.status(400).send({
        success: false,
        message: "Email is required",
      });
    }

    const result = await LostAndFoundCollection.find({
      email,
    }).toArray();

    res.send(result);
  } catch (error) {
    console.error("Get My Items Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get your items",
      error: error.message,
    });
  }
});

// !------------------- Get All My Items -------------------------

app.get("/myItems", async (req, res) => {
  try {
    await connectMongoDB();

    const result = await LostAndFoundCollection.find().toArray();

    res.send(result);
  } catch (error) {
    console.error("Get Items Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get items",
      error: error.message,
    });
  }
});

// !------------------- Get Single Item For Update --------------

app.get("/myItems/:id", async (req, res) => {
  try {
    await connectMongoDB();

    const id = req.params.id;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid item ID",
      });
    }

    const result = await LostAndFoundCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!result) {
      return res.status(404).send({
        success: false,
        message: "Item not found",
      });
    }

    res.send(result);
  } catch (error) {
    console.error("Get Update Item Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get item",
      error: error.message,
    });
  }
});

// !------------------- Delete Item ------------------------------

app.delete("/myItems/:id", async (req, res) => {
  try {
    await connectMongoDB();

    const id = req.params.id;

    if (!id || !ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid item ID",
      });
    }

    const result = await LostAndFoundCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Item not found",
      });
    }

    res.send({
      success: true,
      message: "Item deleted successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete Item Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to delete item",
      error: error.message,
    });
  }
});

// !------------------- Update Item ------------------------------

app.put("/myItems/:id", async (req, res) => {
  try {
    await connectMongoDB();

    const { id } = req.params;

    if (!id) {
      return res.status(400).send({
        success: false,
        message: "Item ID is missing",
      });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid item ID",
      });
    }

    const {
      PostType,
      Title,
      Category,
      Photo,
      description,
      location,
      Contact,
      Date: itemDate,
    } = req.body;

    if (
      !PostType ||
      !Title ||
      !Category ||
      !Photo ||
      !description ||
      !location ||
      !Contact ||
      !itemDate
    ) {
      return res.status(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    const filter = {
      _id: new ObjectId(id),
    };

    const existingItem = await LostAndFoundCollection.findOne(filter);

    if (!existingItem) {
      return res.status(404).send({
        success: false,
        message: "Item not found",
      });
    }

    const updateDoc = {
      $set: {
        PostType,
        Title,
        Category,
        Photo,
        description,
        location,
        Contact,
        Date: itemDate,
        updatedAt: new globalThis.Date(),
      },
    };

    const result = await LostAndFoundCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({
        success: false,
        message: "Item not found",
      });
    }

    if (result.modifiedCount === 0) {
      return res.status(200).send({
        success: true,
        message: "No changes were made",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      });
    }

    return res.status(200).send({
      success: true,
      message: "Item updated successfully",
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Update Error:", error);

    return res.status(500).send({
      success: false,
      message: "Failed to update item",
      error: error.message,
    });
  }
});

// !------------------- Add Recovery Request ---------------------

app.post("/AddRecovered", async (req, res) => {
  try {
    await connectMongoDB();

    const { itemId, name, phone, location, date, email } = req.body;

    if (!itemId || !name || !phone || !location || !date || !email) {
      return res.status(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    if (!ObjectId.isValid(itemId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid item ID",
      });
    }

    const objectId = new ObjectId(itemId);

    const existingItem = await LostAndFoundCollection.findOne({
      _id: objectId,
    });

    if (!existingItem) {
      return res.status(404).send({
        success: false,
        message: "Lost item not found",
      });
    }

    if (existingItem.status === "recovered") {
      return res.status(409).send({
        success: false,
        message: "This item has already been recovered",
      });
    }

    if (existingItem.status === "pending") {
      return res.status(409).send({
        success: false,
        message: "Recovery request already submitted",
      });
    }

    const updateResult = await LostAndFoundCollection.updateOne(
      {
        _id: objectId,
        status: {
          $nin: ["pending", "recovered"],
        },
      },
      {
        $set: {
          status: "pending",

          finderName: name,
          finderPhone: phone,
          finderEmail: email,

          recoveryRequester: email,
          recoveryLocation: location,
          recoveryDate: date,

          recoveryRequestedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(409).send({
        success: false,
        message:
          "Recovery request could not be submitted. Someone may have already submitted a request.",
      });
    }

    const recoveryData = {
      itemId: objectId,

      itemTitle: existingItem.Title || "Lost Item",
      itemImage: existingItem.Photo || "",
      itemCategory: existingItem.Category || "",
      itemLocation: existingItem.location || "",
      itemPostType: existingItem.PostType || "",

      finderName: name,
      finderPhone: phone,
      finderEmail: email,

      ownerName:
        existingItem.ownerName ||
        existingItem.name ||
        existingItem.Name ||
        "Item Owner",

      ownerPhone:
        existingItem.ownerPhone ||
        existingItem.phone ||
        existingItem.Phone ||
        existingItem.Contact ||
        "",

      ownerEmail:
        existingItem.ownerEmail ||
        existingItem.email ||
        existingItem.Email ||
        "",

      location,
      date,

      requestedAt: new Date(),

      status: "pending",

      createdAt: new Date(),
    };

    try {
      const recoveredResult = await recoveredCollection.insertOne(recoveryData);

      return res.status(201).send({
        success: true,
        message: "Recovery request submitted successfully",
        insertedId: recoveredResult.insertedId,
      });
    } catch (error) {
      await LostAndFoundCollection.updateOne(
        {
          _id: objectId,
        },
        {
          $set: {
            status: "active",
          },
          $unset: {
            finderName: "",
            finderPhone: "",
            finderEmail: "",
            recoveryRequester: "",
            recoveryLocation: "",
            recoveryDate: "",
            recoveryRequestedAt: "",
          },
        },
      );

      throw error;
    }
  } catch (error) {
    console.error("AddRecovered Error:", error);

    return res.status(500).send({
      success: false,
      message: "Failed to submit recovery request",
      error: error.message,
    });
  }
});

// !------------------- Confirm Recovery ------------------------

app.patch("/RecoveredItems/:id/confirm", async (req, res) => {
  try {
    await connectMongoDB();

    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({
        success: false,
        message: "Invalid recovery ID",
      });
    }

    const recoveryId = new ObjectId(id);

    const recoveryItem = await recoveredCollection.findOne({
      _id: recoveryId,
    });

    if (!recoveryItem) {
      return res.status(404).send({
        success: false,
        message: "Recovery request not found",
      });
    }

    if (recoveryItem.status === "recovered") {
      return res.status(409).send({
        success: false,
        message: "This item is already recovered",
      });
    }

    const itemId = recoveryItem.itemId;

    const existingItem = await LostAndFoundCollection.findOne({
      _id: itemId,
    });

    if (!existingItem) {
      return res.status(404).send({
        success: false,
        message: "Original lost item not found",
      });
    }

    if (existingItem.status === "recovered") {
      return res.status(409).send({
        success: false,
        message: "Original item is already recovered",
      });
    }

    const itemUpdateResult = await LostAndFoundCollection.updateOne(
      {
        _id: itemId,
        status: "pending",
      },
      {
        $set: {
          status: "recovered",

          finderName:
            recoveryItem.finderName || recoveryItem.finderEmail || "Finder",

          finderEmail: recoveryItem.finderEmail,

          ownerName:
            recoveryItem.ownerName || existingItem.ownerName || "Item Owner",

          ownerEmail:
            recoveryItem.ownerEmail ||
            existingItem.ownerEmail ||
            existingItem.email ||
            "",

          recoveredLocation: recoveryItem.location,
          recoveredDate: recoveryItem.date,
          recoveredBy: recoveryItem.finderEmail || recoveryItem.email,

          recoveredAt: new Date(),
        },

        $unset: {
          recoveryRequester: "",
          recoveryLocation: "",
          recoveryDate: "",
          recoveryRequestedAt: "",
        },
      },
    );

    if (itemUpdateResult.modifiedCount === 0) {
      return res.status(409).send({
        success: false,
        message: "Item could not be confirmed",
      });
    }

    const recoveryUpdateResult = await recoveredCollection.updateOne(
      {
        _id: recoveryId,
        status: "pending",
      },
      {
        $set: {
          status: "recovered",

          finderName:
            recoveryItem.finderName || recoveryItem.finderEmail || "Finder",

          finderEmail: recoveryItem.finderEmail,

          ownerName:
            recoveryItem.ownerName || recoveryItem.ownerEmail || "Item Owner",

          ownerEmail: recoveryItem.ownerEmail,

          recoveredLocation: recoveryItem.location,
          recoveredDate: recoveryItem.date,
          recoveredAt: new Date(),
        },
      },
    );

    return res.send({
      success: true,
      message: "Item recovered successfully",
      itemUpdateResult,
      recoveryUpdateResult,
    });
  } catch (error) {
    console.error("Confirm Recovery Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to confirm recovery",
      error: error.message,
    });
  }
});

// !------------------- Get Recovered Items ----------------------

app.get("/RecoveredItems", async (req, res) => {
  try {
    await connectMongoDB();

    const result = await recoveredCollection
      .find({
        status: "pending",
      })
      .sort({
        recoveredAt: -1,
        createdAt: -1,
      })
      .toArray();

    res.send(result);
  } catch (error) {
    console.error("Get Recovered Items Error:", error);

    res.status(500).send({
      success: false,
      message: "Failed to get recovered items",
      error: error.message,
    });
  }
});

// !------------------- 404 Handler -----------------------------

app.use((req, res) => {
  res.status(404).send({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// !------------------- Vercel Export ----------------------------

module.exports = app;

// !------------------- Local Server -----------------------------

if (require.main === module) {
  app.listen(port, () => {
    console.log(`server is waiting at: ${port}`);
  });
}
