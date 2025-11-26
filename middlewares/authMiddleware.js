import { supabaseAsosAdmin, supabaseAsosCustomer } from "../utils/supabaseClients.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ error: "Missing auth header" });

  const token = authHeader.replace("Bearer ", "").trim();

  const { data: { user }, error } = await supabaseAsosCustomer.auth.getUser(token);

  if (error || !user)
    return res.status(401).json({ error: "Invalid token" });

  req.user = user;
  next();
};
