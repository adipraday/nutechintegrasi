import db from "../config/Database.js"; // Adjust the import path according to your structure

// Controller untuk get banners
export const getBanner = async (req, res) => {
  try {
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

    const banners = rows.map((row) => ({
      banner_name: row.banner_name,
      banner_image: `https://yourdomain.com/${row.banner_image}`,
      description: row.description,
    }));

    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: banners,
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

// Controller untuk get semua / all services
export const getServices = async (req, res) => {
  try {
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

    return res.status(200).json({
      status: 0,
      message: "Sukses",
      data: rows,
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
