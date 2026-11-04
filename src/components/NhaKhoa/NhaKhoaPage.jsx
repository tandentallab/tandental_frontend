import React from "react";
import NhaKhoaTable from "./NhaKhoaTable";
import { Box, Typography } from "@mui/material";

export default function NhaKhoaPage() {
  return (
    <div className="px-3">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
      </Box>

      <NhaKhoaTable />
    </div>
  );
}
