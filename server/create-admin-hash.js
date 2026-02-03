import bcrypt from "bcryptjs";
import fs from "fs";

// CHANGE THESE VALUES TO YOUR DESIRED ADMIN CREDENTIALS
const adminEmail = "admin@dvara.com";
const adminPassword = "Admin@123456"; // Your secure password
const adminName = "Dvara Admin";

async function generateAdminDocument() {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const adminDoc = {
        role: "admin",
        name: adminName,
        email: adminEmail.toLowerCase().trim(),
        passwordHash: passwordHash,
        isDisabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const output = `
==============================================
  MONGODB ADMIN USER DOCUMENT
==============================================

Copy this ENTIRE JSON document and paste it into MongoDB Atlas:

${JSON.stringify(adminDoc, null, 2)}

==============================================
  INSTRUCTIONS
==============================================

1. Go to MongoDB Atlas: https://cloud.mongodb.com/
2. Click on your cluster (dmanager0)
3. Click "Browse Collections"
4. Find the "users" collection
5. Click "INSERT DOCUMENT"
6. Switch to the JSON view (if in table view)
7. Paste the JSON above
8. Click "Insert"

==============================================
  LOGIN CREDENTIALS
==============================================

Email: ${adminEmail}
Password: ${adminPassword}

IMPORTANT: Change the password after first login!

==============================================
`;

    console.log(output);
    fs.writeFileSync("ADMIN_MONGODB_DOCUMENT.txt", output);
    console.log("\n✓ Also saved to: ADMIN_MONGODB_DOCUMENT.txt\n");
}

generateAdminDocument().catch(console.error);
