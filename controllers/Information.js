import db from "../config/Database.js"; // Adjust the import path according to your structure

export const getBanner = async (req, res) => {
  try {
    // Query the database to get all banner details
    const [rows] = await db.query(
      "SELECT * FROM banners ORDER BY created_at DESC"
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Banner not found",
        data: null,
      });
    }

    // Map the banner data to match the response format
    const banners = rows.map((row) => ({
      banner_name: row.banner_name, // Adjust field names as per your table structure
      banner_image: `https://yourdomain.com/${row.banner_image}`, // Assuming the image is stored as a relative path
      description: row.description,
    }));

    return res.status(200).json({
      status: 0, // Success status code as per documentation
      message: "Sukses", // Success message as per documentation
      data: banners, // Return the array of banners
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while fetching banner",
      error: err.message,
    });
  }
};

// Controller to get all services
export const getServices = async (req, res) => {
  try {
    // Query the database to get all services
    const [rows] = await db.query(
      "SELECT service_code, service_name, service_icon, service_tariff FROM services"
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "No services found",
        data: null,
      });
    }

    // Return the services data
    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: rows, // Return the list of services
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: 500,
      message: "Database error while fetching services",
      error: err.message,
    });
  }
};
