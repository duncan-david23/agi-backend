import cron from "node-cron";
import { supabaseAsosAdmin, supabaseAsosCustomer } from "../utils/supabaseClients.js";



let cached10 = [];

const loadDailyTasks = async () => {
  try {
    // 1️⃣ Fetch all products
    const { data: products, error: productsError } = await supabaseAsosAdmin
      .from("products")
      .select("*");

    if (productsError || !products) {
      console.error("Error fetching products:", productsError);
      return;
    }

    // 2️⃣ Pick 10 random products
    cached10 = products.sort(() => Math.random() - 0.5).slice(0, 10);
    console.log("Daily tasks loaded:", cached10.length);

    // 3️⃣ Assign to all users
    await assignTasksToAllUsers();

  } catch (err) {
    console.error("Error in loadDailyTasks:", err);
  }
};

const assignTasksToAllUsers = async () => {
  try {
    // 1️⃣ Fetch all users
    const { data: users, error: usersError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("user_id");

    if (usersError || !users) {
      console.error("Error fetching users:", usersError);
      return;
    }

    // 2️⃣ For each user, insert all 10 products individually
    for (const user of users) {
      const rowsToInsert = cached10.map(product => ({
        user_id: user.user_id,
        product_name: product.product_name,
        product_price: product.product_price,
        product_image: product.product_image,
      }));

      const { error: insertError } = await supabaseAsosCustomer
        .from("user_tasks")
        .insert(rowsToInsert);

      if (insertError) {
        console.error(`Failed to assign tasks for user ${user.user_id}:`, insertError);
      }
    }

  } catch (err) {
    console.error("Error in assignTasksToAllUsers:", err);
  }
};

// Schedule cron job (e.g., every midnight)
// loadDailyTasks();
cron.schedule("0 0 * * *", loadDailyTasks);







export const fetchTasks = async (req, res) => {
  try {
    // 1️⃣ Get user ID from middleware (assume req.user is set after auth)
    const userId = req.user.id;

    // 2️⃣ Fetch all tasks for the user
    const { data, error } = await supabaseAsosCustomer
      .from("user_tasks")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching user tasks:", error);
      return res.status(500).json({ error: "Server error" });
    }

    // 3️⃣ Return tasks
    return res.status(200).json({ tasks: data.splice(0, 10) || [] });
  } catch (err) {
    console.error("Unexpected error in fetchTasks:", err);
    return res.status(500).json({ error: "Server error" });
  }
};






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

// export const fetchUserTasks = async (req, res) => {
//   try {
//     // 1️⃣ Check Authorization Header
//     const authHeader = req.headers.authorization;
//     if (!authHeader) {
//       return res.status(401).json({ error: "Missing authorization header" });
//     }

//     const token = authHeader.replace("Bearer ", "").trim();

//     // 2️⃣ Validate user token
//     const { data: { user }, error: userError } = await supabaseAsosCustomer.auth.getUser(token);

//     if (userError || !user) {
//       console.error("Invalid or expired token:", userError);
//       return res.status(401).json({ error: "Invalid or expired token" });
//     }

//     const userId = user.id;

//     // 3️⃣ Fetch all tasks for this user
//     const { data: tasks, error: tasksError } = await supabaseAsosCustomer
//       .from('user_tasks')
//       .select('*')
//       .eq('user_id', userId);

//     if (tasksError) {
//       console.error("Error fetching user tasks:", tasksError);
//       return res.status(500).json({ error: "Failed to fetch user tasks" });
//     }

//     // 4️⃣ Return tasks
//     return res.status(200).json({
//       message: "User tasks fetched successfully",
//       tasks: tasks || []
//     });

//   } catch (err) {
//     console.error("Unexpected error in fetchUserTasks:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };
