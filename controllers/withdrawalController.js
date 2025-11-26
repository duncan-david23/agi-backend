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







// fetch all withdrawals for admin
export const adminGetAllWithdrawals = async (req, res) => {
  try {
    // 1️⃣ Check for Authorization Header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    // 2️⃣ Validate Admin Token
    const { data: { user }, error: userError } = await supabaseAsos.auth.getUser(token);

    if (userError || !user) {
      console.error("Invalid or expired token:", userError);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // 3️⃣ Fetch all withdrawal requests
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
};












// approve or reject withdrawal
// export const adminUpdateWithdrawalStatus = async (req, res) => {
//   try {
//     const { withdrawalId, userId, amount } = req.body;

//     if (!withdrawalId) {
//       return res.status(400).json({ error: "Missing required fields" });
//     }

//     // Update the withdrawal status
//     const { data: updateData, error: updateError } = await supabaseAsosAdmin
//       .from("withdrawal_request")
//       .update({ status: 'completed' })
//       .eq("id", withdrawalId)
//       .select()
//       .single();

//     if (updateError) {
//       console.error("Error updating withdrawal status:", updateError);
//       return res.status(500).json({ error: "Failed to update withdrawal status" });
//     }

//     return res.status(200).json({
//       message: "Withdrawal status updated successfully",
//       withdrawal: updateData,
//     });

//   } catch (err) {
//     console.error("Unexpected error in adminUpdateWithdrawalStatus:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };




// new approval commission under test

export const adminUpdateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId, userId, amount } = req.body;

    if (!withdrawalId || !userId || !amount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Update the withdrawal status
    const { data: updateData, error: updateError } = await supabaseAsosAdmin
      .from("withdrawal_request")
      .update({ status: 'completed' })
      .eq("id", withdrawalId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating withdrawal status:", updateError);
      return res.status(500).json({ error: "Failed to update withdrawal status" });
    }

    // 2. Fetch the user’s current commission
    const { data: userData, error: userError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("withdrawable_commission")
      .eq("user_id", userId)
      .single();

    if (userError || !userData) {
      console.error("Error fetching user commission:", userError);
      return res.status(500).json({ error: "Failed to fetch user commission" });
    }

    // 3. Calculate the new commission
    const newCommission = userData.withdrawable_commission - amount;

    if (newCommission < 0) {
      return res.status(400).json({ error: "Insufficient commission balance" });
    }

    // 4. Update the user’s commission
    const { error: commissionError } = await supabaseAsosCustomer
      .from("users_profile")
      .update({ withdrawable_commission: newCommission })
      .eq("user_id", userId);

    if (commissionError) {
      console.error("Error updating commission:", commissionError);
      return res.status(500).json({ error: "Failed to update user commission" });
    }

    // 5. Final response
    return res.status(200).json({
      message: "Withdrawal completed & commission updated",
      withdrawal: updateData,
      newCommission,
    });

  } catch (err) {
    console.error("Unexpected error in adminUpdateWithdrawalStatus:", err);
    return res.status(500).json({ error: "Server error" });
  }
};






