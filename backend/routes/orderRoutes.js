// @ts-nocheck
// backend/routes/orderRoutes.js

import express from "express";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const router = express.Router();

/*
---------------------------------------
 CREATE ORDER
---------------------------------------
*/
router.post("/", async (req, res) => {
  try {
    const { customerName, phone, location, items } = req.body;

    if (!customerName || !phone || !location || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const orderItems = [];
    let total = 0;

    for (const cartItem of items) {
      const product = await Product.findById(cartItem.productId);

      if (!product) continue;

      const price = product.sale ? product.salePrice : product.price;
      const qty = Number(cartItem.quantity || 0);

      total += price * qty;

      orderItems.push({
        productId: product._id,
        name: product.name,
        size: cartItem.size || null,
        quantity: qty,
        price: price
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: "No valid items in cart" });
    }

    const newOrder = new Order({
      customerName,
      phone,
      location,
      items: orderItems,
      total,
      status: "pending"
    });

    await newOrder.save();

    return res.status(201).json({
      message: "Order created",
      order: newOrder
    });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return res.status(500).json({
      message: "Error creating order",
      error: error.message
    });
  }
});


/*
---------------------------------------
 ADMIN – GET ALL ORDERS
---------------------------------------
*/
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    console.error("GET /api/orders error:", error);
    return res.status(500).json({
      message: "Error fetching orders",
      error: error.message
    });
  }
});


/*
---------------------------------------
 ADMIN – MARK ORDER AS DELIVERED
---------------------------------------
*/
router.put("/:id/deliver", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "delivered";

    await order.save();

    return res.json({
      message: "Order marked as delivered",
      order
    });
  } catch (error) {
    console.error("PUT /api/orders/:id/deliver error:", error);
    return res.status(500).json({
      message: "Error updating order",
      error: error.message
    });
  }
});

export default router;




