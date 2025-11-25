import {supabaseAsosCustomer, supabaseAsosAdmin, supabaseAsos} from '../utils/supabaseClients.js'



export const requestWithdrawal = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing authorization header" });

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseAsosCustomer.auth.getUser(token);
    if (userError || !user) return res.status(401).json({ error: "Invalid or expired token" });

    const userId = user.id;

    // 3️⃣ Extract withdrawal details from request body
    const { amount, method, recipientDetails, referenceNumber, fullName } = req.body;

    if (!amount || !method || !recipientDetails || !referenceNumber || !fullName) {
      return res.status(400).json({ error: "Missing required withdrawal details" });
    }

    // 4️⃣ Fetch ONLY the user profile
    const { data: profile, error: profileError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // 5️⃣ Check if user has enough withdrawable funds
    if (profile.withdrawable_commission < 165) {
      return res.status(403).json({ message: "Insufficient funds for withdrawal (min GHS 165 required)" });
    }

    if (amount > profile.withdrawable_commission) {
      return res.status(403).json({ message: "Requested amount exceeds withdrawable balance" });
    }

    // 6️⃣ Insert withdrawal request into the admin DB
    const { data: withdrawalData, error: withdrawalError } = await supabaseAsosAdmin
      .from("withdrawal_request")
      .insert([
        {
          user_id: userId,
          amount,
          full_name: fullName,
          payment_method: method,
          account_number: recipientDetails,
          user_account_number: referenceNumber,
          status: "pending",
        },
      ])
      .single();

    if (withdrawalError) {
      console.error("Error creating withdrawal request:", withdrawalError);
      return res.status(500).json({ error: "Failed to create withdrawal request" });
    }

    return res.status(201).json({ message: "Withdrawal request submitted successfully" });

  } catch (err) {
    console.error("Unexpected error in requestWithdrawal:", err);
    return res.status(500).json({ error: "Server error" });
  }
};










// Fetch all withdrawal requests 
export const getUserWithdrawals = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate User Token
    const { data: { user }, error: userError } = await supabaseAsos.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }



    // 3️⃣ Fetch withdrawal requests for the authenticated user
    const { data: withdrawals, error: withdrawalsError } = await supabaseAsosAdmin
      .from("withdrawal_request")
      .select("*")
      .order('created_at', { ascending: false });

    if (withdrawalsError) {
      console.error("Error fetching withdrawal requests:", withdrawalsError);
      return res.status(500).json({ error: "Failed to fetch withdrawal requests" });
    }

    // 4️⃣ Return the list of withdrawal requests
    return res.status(200).json({ withdrawals });

  } catch (err) {
    console.error("Unexpected error in getUserWithdrawals:", err);
    return res.status(500).json({ error: "Server error" });
  }
}