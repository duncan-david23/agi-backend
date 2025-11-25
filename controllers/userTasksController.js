import cron from "node-cron";
import { supabaseAsosAdmin, supabaseAsosCustomer } from "../utils/supabaseClients.js";

let cachedTasks = []; // store 10 random tasks for the day

// Utility: Shuffle array to pick random products
const shuffleArray = (arr) => arr.sort(() => Math.random() - 0.5);

// ---------------------------------------------
// FETCH TASKS CONTROLLER
// ---------------------------------------------
export const fetchTasks = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token using supabaseAsosCustomer
    const { data: { user }, error: userError } = await supabaseAsosCustomer.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 3️⃣ Return 10 random tasks (from cachedTasks)
    return res.status(200).json({
      message: "Tasks fetched successfully",
      tasks: cachedTasks,
    });

  } catch (err) {
    console.error("Unexpected error in fetchTasks:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------------------------------------
// CRON JOB — Refresh 10 random tasks every midnight
// ---------------------------------------------
const loadDailyTasks = async () => {
  try {
    console.log("Refreshing 10 random tasks from admin DB...");

    const { data: products, error } = await supabaseAsosAdmin
      .from("products")
      .select("*");

    if (error) {
      console.error("Error fetching products from admin DB:", error);
      return;
    }

    if (!products || products.length === 0) {
      console.error("No products found in admin DB");
      return;
    }

    // Shuffle and pick 10
    cachedTasks = shuffleArray(products).slice(0, 10);
    // console.log(`Daily tasks refreshed: ${cachedTasks.length} products loaded`);
  } catch (err) {
    console.error("Error in loadDailyTasks cron:", err);
  }
};

// Run on server startup
loadDailyTasks();

// Schedule cron job to run every midnight
cron.schedule("0 0 * * *", () => {
  loadDailyTasks();
});





// insert tasks for user

export const addUserTasks = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token
    const { data: { user }, error: userError } =
      await supabaseAsosCustomer.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = user.id;

    // 3️⃣ Extract product details
    const { product_id, product_name, product_image, product_price } = req.body;

    if (!product_id || !product_name || !product_image || !product_price) {
      return res.status(400).json({ error: "Missing required product details" });
    }

    // 4️⃣ Insert into user_tasks table
    const { data: taskData, error: tasksError } = await supabaseAsosCustomer
      .from("user_tasks")
      .insert([
        {
          user_id: userId,
          product_id,
          product_name,
          product_image,
          product_price,
        },
      ])
      .select("*")
      .single();

    if (tasksError) {
      console.error("Error inserting user tasks:", tasksError);
      return res.status(500).json({ error: "Failed to insert user task" });
    }

    return res.status(201).json({
      message: "Product added to user task list",
      task: taskData,
    });
  } catch (err) {
    console.error("Unexpected error in addUserTasks:", err);
    return res.status(500).json({ error: "Server error" });
  }
};



export const sellAllTasks = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseAsosCustomer.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = user.id;

    // 3️⃣ Delete ALL tasks belonging to this user
    const { error: deleteError } = await supabaseAsosCustomer
      .from("user_tasks")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting user tasks:", deleteError);
      return res.status(500).json({ error: "Failed to delete tasks" });
    }

    // 4️⃣ Success response
    return res.status(200).json({
      message: "All tasks sold successfully",
    });

  } catch (err) {
    console.error("Unexpected error in sellAllTasks:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


// Update user commission

export const updateCommission = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token
    const { data: { user }, error: userError } =
      await supabaseAsosCustomer.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = user.id;

    // 3️⃣ Extract commission from frontend
    const { commissionAmount } = req.body;

    if (!commissionAmount || Number(commissionAmount) <= 0) {
      return res.status(400).json({ error: "Invalid commission amount" });
    }

    // 4️⃣ Fetch existing profile
    const { data: profileData, error: profileError } =
      await supabaseAsosCustomer
        .from("users_profile")
        .select("*")
        .eq("user_id", userId)
        .single();

    if (profileError || !profileData) {
      console.error("Error fetching profile:", profileError);
      return res.status(500).json({ error: "Could not fetch user profile" });
    }

    // 5️⃣ Calculate new withdrawable commission
    const newCommission =
      Number(profileData.withdrawable_commission) + Number(commissionAmount);

    // 6️⃣ Update withdrawable_commission
    const { data: updateData, error: updateError } =
      await supabaseAsosCustomer
        .from("users_profile")
        .update({ withdrawable_commission: newCommission })
        .eq("user_id", userId)
        .select();

    if (updateError) {
      console.error("Error updating commission:", updateError);
      return res.status(500).json({ error: "Failed to update commission" });
    }

    // 7️⃣ Return updated profile
    return res.status(200).json({
      message: "Commission updated successfully",
      profile: updateData[0],
    });

  } catch (err) {
    console.error("Unexpected error in updateCommission:", err);
    return res.status(500).json({ error: "Server error" });
  }
};





// fetch user tasks

export const fetchUserTasks = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate user token
    const { data: { user }, error: userError } = await supabaseAsosCustomer.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = user.id;

    // 3️⃣ Fetch all tasks for this user
    const { data: tasks, error: tasksError } = await supabaseAsosCustomer
      .from('user_tasks')
      .select('*')
      .eq('user_id', userId);

    if (tasksError) {
      console.error("Error fetching user tasks:", tasksError);
      return res.status(500).json({ error: "Failed to fetch user tasks" });
    }

    // 4️⃣ Return tasks
    return res.status(200).json({
      message: "User tasks fetched successfully",
      tasks: tasks || []
    });

  } catch (err) {
    console.error("Unexpected error in fetchUserTasks:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
