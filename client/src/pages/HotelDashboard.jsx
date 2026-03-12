
import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../layout/DashboardLayout";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import BedRoundedIcon from "@mui/icons-material/BedRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

import HotelDashboardOverview from "./HotelDashboardOverview";
import RoomManagement from "./RoomManagement";
import BookingManagement from "./BookingManagement";
import HotelBookings from "./HotelBookings";
import HotelChat from "./HotelChat";
import HotelCustomerIntelligence from "./HotelCustomerIntelligence";
import HotelReviews from "./HotelReviews";
import HotelAnalytics from "./HotelAnalytics";
import HotelProfile from "./HotelProfile";

export default function HotelDashboard() {
  const { t } = useTranslation();
  const [section, setSection] = useState("overview");
  const menuItems = [
    { id: "overview", label: t("dashboard.menu.overview"), icon: <DashboardRoundedIcon /> },
    { id: "revenue", label: t("dashboard.menu.revenue"), icon: <TrendingUpRoundedIcon /> },
    { id: "rooms", label: t("dashboard.menu.rooms"), icon: <BedRoundedIcon /> },
    { id: "bookings", label: t("dashboard.menu.bookings"), icon: <EventAvailableRoundedIcon /> },
    { id: "customers", label: t("dashboard.menu.customers"), icon: <PeopleAltRoundedIcon /> },
    { id: "reviews", label: t("dashboard.menu.reviews"), icon: <StarRoundedIcon /> },
    { id: "chat", label: t("dashboard.menu.chat"), icon: <ChatRoundedIcon /> },
    { id: "reports", label: t("dashboard.menu.reports"), icon: <AssessmentRoundedIcon /> },
  ];
  const sectionMeta = {
    overview: {
      title: t("dashboard.section.overview.title"),
      subtitle: t("dashboard.section.overview.subtitle"),
    },
    revenue: {
      title: t("dashboard.section.revenue.title"),
      subtitle: t("dashboard.section.revenue.subtitle"),
    },
    rooms: {
      title: t("dashboard.section.rooms.title"),
      subtitle: t("dashboard.section.rooms.subtitle"),
    },
    bookings: {
      title: t("dashboard.section.bookings.title"),
      subtitle: t("dashboard.section.bookings.subtitle"),
    },
    customers: {
      title: t("dashboard.section.customers.title"),
      subtitle: t("dashboard.section.customers.subtitle"),
    },
    reviews: {
      title: t("dashboard.section.reviews.title"),
      subtitle: t("dashboard.section.reviews.subtitle"),
    },
    chat: {
      title: t("dashboard.section.chat.title"),
      subtitle: t("dashboard.section.chat.subtitle"),
    },
    reports: {
      title: t("dashboard.section.reports.title"),
      subtitle: t("dashboard.section.reports.subtitle"),
    },
    profile: {
      title: t("dashboard.section.profile.title"),
      subtitle: t("dashboard.section.profile.subtitle"),
    },
  };
  const meta = sectionMeta[section] ?? sectionMeta.overview;
  const renderSection = () => {
    switch (section) {
      case "overview":
        return <HotelDashboardOverview showHeader={false} onQuickAction={setSection} />;
      case "revenue":
        return <HotelAnalytics showHeader={false} />;
      case "rooms":
        return <RoomManagement showHeader={false} />;
      case "bookings":
        return <HotelBookings showHeader={false} />;
      case "customers":
        return <HotelCustomerIntelligence showHeader={false} />;
      case "reviews":
        return <HotelReviews showHeader={false} />;
      case "chat":
        return <HotelChat showHeader={false} />;
      case "reports":
        return <BookingManagement showHeader={false} />;
      case "profile":
        return <HotelProfile showHeader={false} />;
      default:
        return <HotelDashboardOverview showHeader={false} onQuickAction={setSection} />;
    }
  };

  return (
    <DashboardLayout
      menuItems={menuItems}
      selected={section}
      onSelect={setSection}
    >
      <Box sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "#0f172a" }}>
          {meta.title}
        </Typography>
        <Typography sx={{ color: "var(--dash-muted)", mt: 0.5 }}>
          {meta.subtitle}
        </Typography>
      </Box>
      {renderSection()}
    </DashboardLayout>
  );
}
