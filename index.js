const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger-output.json");
const faker = require("faker");

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ProductSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    createdAt: { type: Date, default: new Date() },
  },
  { versionKey: false }
);

const ImageSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
  },
  { versionKey: false, timestamps: true }
);

const Product = mongoose.model("products", ProductSchema);
const ImageModel = mongoose.model("images", ImageSchema);

const connectAndRetry = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://test:kpcl8ihvWZHgCqzU@cluster0.rrcyu.mongodb.net/test"
    );
    console.log("Connected");
  } catch (error) {
    console.log("Connecting in 5000ms .....");
    setTimeout(connectAndRetry, 5000);
  }
};

// connectAndRetry();

app.get("/api/products", async (req, res) => {
  try {
    const { month, year } = req.query;
    if (month && year) {
      const products = await Product.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                date: "$createdAt",
                format: "%Y-%m-%d",
              },
            },
            price: { $sum: "$price" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        {
          $match: {
            _id: {
              $gte: `${year}-${month}-01`,
              $lte: `${year}-${month}-${new Date(year, month, 0).getDate()}`,
            },
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            price: "$price",
            count: "$count",
          },
        },
      ]);

      return res.json({ success: true, products });
    } else {
      const products = await Product.find();
      return res.json({ success: true, products });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error,
    });
  }
});

app.post("/api/products/generate", async (req, res) => {
  try {
    const { num } = req.body;
    if (isNaN(+num)) {
      return res.status(400).json({
        success: false,
        message: "num must be a number",
      });
    }
    let products = [];
    for (let index = 0; index < parseInt(num); index++) {
      products.push({
        name: faker.commerce.productName(),
        price: faker.commerce.price(),
        quantity: faker.datatype.number(),
        createdAt: faker.date.past(),
      });
    }
    products = await Product.insertMany(products);
    return res.status(200).json({
      success: true,
      products,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      err,
    });
  }
});

app.post("/api/test", (req, res) => {
  try {
    const { name } = req.body;
    console.log(req);
    return res.json({
      name,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      err,
    });
  }
});

app.get("/api/test/v1", (req, res) => {
  return res.json({
    name: "test v1 work",
  });
});

app.get("/api/test/v2", (req, res) => {
  return res.json({
    name: "test v2 work",
  });
});

app.listen(process.env.PORT || 4000);
