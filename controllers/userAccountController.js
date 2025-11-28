import {supabaseAsosCustomer, supabaseAsos} from '../utils/supabaseClients.js'
import { loadDailyTasks } from './userTasksController.js';


export const createUserProfile = async (req, res)=> {
    try {
    // 1️⃣ Check for Authorization Header
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

    
    // 4️⃣ Extract product details
    const {
        fullName,
        email,
        referralCode
        
    } = req.body;
    
            const generateAccountNumber = (fullName) => {
            // Extract first 3 letters
            let namePart = fullName.trim().slice(0, 3).toUpperCase();

            // Pad if name < 3 chars
            if (namePart.length < 3) {
                namePart = namePart.padEnd(3, 'X');
            }

            const randomNumber = Math.floor(100000 + Math.random() * 900000);

            // No dashes
            return `ACCT${randomNumber}${namePart}`;
            };
            const accountNumber = generateAccountNumber(fullName);

    // 5️⃣ Create User Profile
    const { data: profileData, error: profileError } = await supabaseAsosCustomer
      .from('users_profile')
      .insert([{ user_id: user.id, user_name: fullName, user_email: email,account_number:accountNumber, referral_code: referralCode, wallet: 56 , withdrawable_commission: 0}]);

    if (profileError) {
      console.error("Error creating user profile:", profileError);
      return res.status(500).json({ error: "Failed to create user profile" });
    }
    return res.status(201).json({ message: "User profile created successfully", profile: profileData });
  } catch (err) {
    console.error("Unexpected error in createUserProfile:", err);
    return res.status(500).json({ error: "Server error" });
  }

}




// fetch user profile by user 

export const getUserProfile = async (req, res) => {
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

    // 3️⃣ Fetch ONLY the user profile
    const { data: profile, error: profileError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // 4️⃣ Return profile only
    return res.status(200).json({
      message: "Profile fetched successfully",
      profile,
    });

  } catch (err) {
    console.error("Unexpected error in getUserProfile:", err);
    return res.status(500).json({ error: "Server error" });
  }
};





// for ADMIN ONLY
// fetch all users profile 
export const getAllUserProfiles = async (req, res) => {
  try {
    // 1️⃣ Check Authorization Header
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

    const userId = user.id;

    // 3️⃣ Fetch ONLY the user profile
    const { data: profile, error: profileError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("*")
     

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // 4️⃣ Return profile only
    return res.status(200).json(profile);

  } catch (err) {
    console.error("Unexpected error in getUserProfile:", err);
    return res.status(500).json({ error: "Server error" });
  }
};




// for ADMIN ONLY
// top up user wallet by admin
// export const topUpUserWallet = async (req, res) => {
//   try {
//     const { userId, amount } = req.body;
    
//     // Validate input
//     if (!userId || !amount || amount <= 0) {
//       return res.status(400).json({ error: "Invalid userId or amount" });
//     }

//     // Fetch current wallet balance
//     const { data: userProfile, error: fetchError } = await supabaseAsosCustomer
//       .from("users_profile")
//       .select("wallet")
//       .eq("user_id", userId)
//       .single();

//     if (fetchError || !userProfile) {
//       console.error("Error fetching user profile:", fetchError);
//       return res.status(500).json({ error: "Failed to fetch user profile" });
//     }

//     const newBalance = userProfile.wallet + amount;

//     // Update wallet balance
//     const { data: updateData, error: updateError } = await supabaseAsosCustomer
//       .from("users_profile")
//       .update({ wallet: newBalance })
//       .eq("user_id", userId);

//     if (updateError) {
//       console.error("Error updating wallet balance:", updateError);
//       return res.status(500).json({ error: "Failed to update wallet balance" });
//     }

//     return res.status(200).json({ message: "Wallet topped up successfully", newBalance });

//   } catch (err) {
//     console.error("Unexpected error in topUpUserWallet:", err);
//     return res.status(500).json({ error: "Server error" });
//   }
// };





export const topUpUserWallet = async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid userId or amount" });
    }

    // 1️⃣ Fetch current user profile (to get wallet + referral_code)
    const { data: userProfile, error: fetchError } = await supabaseAsosCustomer
      .from("users_profile")
      .select("wallet, referral_code")
      .eq("user_id", userId)
      .single();

    if (fetchError || !userProfile) {
      console.error("Error fetching user profile:", fetchError);
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }

    // 2️⃣ Top up the user's wallet
    const newBalance = userProfile.wallet + amount;

    const { error: updateError } = await supabaseAsosCustomer
      .from("users_profile")
      .update({ wallet: newBalance })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating wallet balance:", updateError);
      return res.status(500).json({ error: "Failed to update wallet balance" });
    }

    // ---------------------------
    // REFERRAL BONUS SECTION
    // ---------------------------

const referralAccountNumber = userProfile.referral_code.trim();

if (referralAccountNumber) {
  const { data: referrerProfile, error: referrerError } = await supabaseAsosCustomer
    .from("users_profile")
    .select("user_id, withdrawable_commission")
    .ilike("account_number", referralAccountNumber)
    .single();

  if (!referrerError && referrerProfile) {
    const referrerBonus = amount * 0.08; // 8% commission
    const newReferrerBalance = (referrerProfile.withdrawable_commission || 0) + referrerBonus;

    await supabaseAsosCustomer
      .from("users_profile")
      .update({ withdrawable_commission: newReferrerBalance })
      .eq("user_id", referrerProfile.user_id);
  }
}

    // ---------------------------
    // END REFERRAL BONUS
    // ---------------------------

    return res.status(200).json({
      message: "Wallet topped up successfully, referral processed",
      newBalance,
    });

  } catch (err) {
    console.error("Unexpected error in topUpUserWallet:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
