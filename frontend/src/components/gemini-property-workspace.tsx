"use client";

import Link from "next/link";
import {useEffect, useState, type ReactNode} from "react";
import {Broom, Plus, Settings2, UserRound} from "lucide-react";
import {validateProfile, type PropertyProfile} from "@/lib/property-profile";
import type {PropertyInventory} from "@/lib/property-inventory";
import {useRoomPreview} from "./room-preview-store";
import {useBookingStays} from "./booking-stays";
import {PropertyProfileEditor} from "./property-profile-editor";
import {RoomTypesPreview} from "./room-preview";
import {RoomActions} from "./room-actions";
import {WorkbenchDrawer} from "./workbench-drawer";
import {DesktopPageToolbar} from "./desktop-page-toolbar";
import "./gemini-property-workspace.css";

// Structure follows view-mine in the approved Gemini source. Existing stores
// retain revision checks and account-scoped writes for every room action.
export function GeminiPropertyWorkspace({scope, zh, readOnly, account}: {
  scope: string; zh: boolean; readOnly: boolean; account: ReactNode;
}) {
  const t = (en: string, cn: string) => zh ? cn : en;
  const store = useRoomPreview(scope);
  const stays = useBookingStays();
  const [drawer, setDrawer] = useState<"profile" | "types" | "account" | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [profile, setProfile] = useState<PropertyProfile | null>(null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "error">("loading");
  const [profileVersion, setProfileVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [undo, setUndo] = useState<{roomId: string; inventory: PropertyInventory} | null>(null);
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#room-types") setDrawer("types");
      if (window.location.hash === "#property-profile") setDrawer("profile");
    };
    const timer = setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => {clearTimeout(timer); window.removeEventListener("hashchange", sync);};
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/workspace/profile", {cache: "no-store", signal: controller.signal}).then(async response => {
      if (!response.ok) throw Error();
      const body = await response.json();
      const next = body.profile === null ? null : validateProfile(body.profile);
      if (body.profile !== null && !next) throw Error();
      if (!controller.signal.aborted) {setProfile(next); setProfileState("ready");}
    }).catch(() => {if (!controller.signal.aborted) setProfileState("error");});
    const refresh = () => setProfileVersion(version => version + 1);
    window.addEventListener("staycraft-profile-changed", refresh);
    return () => {controller.abort(); window.removeEventListener("staycraft-profile-changed", refresh);};
  }, [profileVersion]);
  const today = new Intl.DateTimeFormat("sv-SE", {timeZone: "Asia/Shanghai"}).format(new Date());
  const {inventory} = store.data;
  const activeRooms = inventory.rooms.filter(room => room.active);
  const dirtyCount = activeRooms.filter(room => room.housekeeping === "dirty").length;
  const rates = inventory.types.filter(type => activeRooms.some(room => room.typeId === type.id)).map(type => type.price).filter(rate => rate > 0);
  const money = (amount: number) => `¥${amount.toLocaleString(zh ? "zh-CN" : "en-GB", {maximumFractionDigits: 2})}`;
  const rateLabel = rates.length ? `${money(Math.min(...rates))}${Math.min(...rates) !== Math.max(...rates) ? ` — ${money(Math.max(...rates))}` : ""} / ${t("night", "晚")}` : t("Not set", "待设置");
  const status = (roomId: string) => {
    const room = inventory.rooms.find(item => item.id === roomId);
    if (!room) return {occupied: false, reserved: false, tone: "muted", label: t("Room unavailable", "客房已不存在")};
    const occupied = stays.bookings.some(booking => booking.room_id === roomId && booking.stay_state === "checked_in");
    const reserved = stays.bookings.some(booking => booking.room_id === roomId && booking.status === "confirmed" && booking.stay_state === "pending" && booking.arrival <= today && booking.departure > today);
    return {occupied, reserved, tone: !room.active || !stays.ready ? "muted" : occupied || reserved ? "violet" : room.housekeeping === "dirty" ? "coral" : "emerald",
      label: !room.active ? t("Inactive", "停用") : !stays.ready ? (stays.failed ? t("Status unavailable", "入住状态待核对") : t("Loading status…", "正在读取房态…")) : occupied ? t("Checked in", "已入住") : reserved ? t("Reserved", "已预订") : room.housekeeping === "dirty" ? t("To clean · click to finish", "待清洁 · 点击打扫") : t("Cleaned · available", "已清洁 · 空闲")};
  };
  async function clean(roomId: string, revert = false) {
    if (readOnly || store.writing || store.unavailable) return;
    const expected = revert ? undo?.inventory : inventory;
    if (!expected) return;
    const next = {...inventory, rooms: inventory.rooms.map(room => room.id === roomId ? {...room, housekeeping: revert ? "dirty" as const : "clean" as const} : room)};
    setError("");
    if (await store.save({inventory: next, photos: store.data.photos}, expected)) {
      setUndo(revert ? null : {roomId, inventory: next});
      setNotice(revert ? t("Cleaning change undone.", "已撤销清洁标记。") : t("Room marked as cleaned.", "已完成清洁，房态已更新。"));
    } else {setUndo(null); setError(t("The room changed or could not be saved. Refresh its status and retry.", "房态已变化或保存未成功，请刷新房态后重试。"));}
  }
  function closeDrawer() {
    setDrawer(null);
    setProfileDirty(false);
    if (["#room-types", "#property-profile"].includes(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return <div className="gemini-property-workspace">
    <DesktopPageToolbar><div className="gemini-property-tools"><button type="button" onClick={() => setDrawer("types")}><Settings2 size={15}/>{t("Room types & rates", "房型与挂牌价")}</button><button type="button" onClick={() => setDrawer("account")}><UserRound size={15}/>{t("Account settings", "账户设置")}</button></div></DesktopPageToolbar>
    <div className="property-bento-grid">
      <article className="property-bento-card"><header className="property-card-header"><div><h2>{t("Room Status Board", "楼层房态可视化看板")}</h2><p>{t("Click a room to view stay details, or finish cleaning directly.", "点击房间查看入住安排，待清洁客房可直接完成打扫")}</p></div>{store.ready && !store.unavailable && <span className="property-pill violet">{zh ? `启用 ${activeRooms.length} 间 · 待清洁 ${dirtyCount} 间` : `${activeRooms.length} active · ${dirtyCount} to clean`}</span>}</header>
        {store.unavailable ? <div role="alert"><p>{t("Room settings could not be loaded.", "暂时无法读取客房资料。")}</p><button type="button" onClick={() => void store.reload()}>{t("Retry", "重新读取")}</button></div>
          : !store.ready ? <p role="status">{t("Loading rooms…", "正在读取房态…")}</p>
          : inventory.rooms.length ? <div className="property-room-grid">{inventory.rooms.map(room => {
            const roomType = inventory.types.find(type => type.id === room.typeId);
            const current = status(room.id);
            const directClean = stays.ready && room.active && room.housekeeping === "dirty" && !current.occupied && !current.reserved && !readOnly;
            return <div className={`property-room-tile ${room.housekeeping === "dirty" ? "is-dirty" : ""}`} key={room.id}>
              <button type="button" className="property-room-main" disabled={store.writing} onClick={() => directClean ? void clean(room.id) : setSelectedRoom(room.id)} aria-label={`${room.number} · ${current.label}`}>
                <span className="property-room-top"><strong>{room.number}</strong><span className={`property-pill ${current.tone}`}>{current.label}</span></span>
                <small>{room.floor} · {roomType?.name ?? t("Room type unavailable", "房型待设置")} · {roomType ? `${money(roomType.price)} / ${t("night", "晚")}` : "—"}</small>
              </button>
              {room.active && room.housekeeping === "dirty" && (current.occupied || current.reserved) && !readOnly && <button type="button" className="property-clean-action" disabled={store.writing} onClick={() => void clean(room.id)}><Broom size={13}/>{t("Mark as cleaned", "完成清洁")}</button>}
              <Link className="property-room-details" href={`/app/rooms/${room.id}`}>{t("Room details", "客房详情")} →</Link>
            </div>;
          })}</div> : <div className="property-empty"><h3>{t("Add your first room", "添加第一间客房，建立你的房态棋盘")}</h3><p>{t("Choose a room type, floor and room number. Bookings and cleaning status will appear here.", "设置房型、楼层和房号后，就能在这里核对入住与清洁状态。")}</p></div>}
        {stays.failed && <p role="alert">{t("Stay status could not be loaded.", "暂时无法读取入住状态。")} <button type="button" onClick={stays.retry}>{t("Retry", "重试")}</button></p>}
        {notice && <p className="property-feedback" role="status">{notice}{undo && <button type="button" disabled={store.writing} onClick={() => void clean(undo.roomId, true)}>{t("Undo", "撤销")}</button>}</p>}
        {error && <p className="property-error" role="alert">{error}</p>}
        {!readOnly && <Link href="/app/rooms/new" className="property-add-room"><Plus size={15}/>{t("Add room", "添加客房")}</Link>}
      </article>
      <article className="property-bento-card"><header className="property-card-header"><h2>{t("Property Profile", "民宿基础资料")}</h2>{profileState === "ready" && profile && <span className="property-pill emerald">{t("Saved to account", "已关联云端")}</span>}</header>
        {profileState === "loading" ? <p role="status">{t("Loading property details…", "正在读取民宿资料…")}</p> : profileState === "error" ? <div role="alert"><p>{t("Property details could not be loaded.", "暂时无法读取民宿资料。")}</p><button type="button" onClick={() => {setProfileState("loading"); setProfileVersion(version => version + 1);}}>{t("Retry", "重新读取")}</button></div> : <dl className="property-clean-list">
          <div><dt>{t("Property name", "民宿名称")}</dt><dd>{profile?.name || t("Not set", "待填写")}</dd></div>
          <div><dt>{t("Full address", "详细地址")}</dt><dd>{profile?.location || t("Not set", "待填写")}</dd></div>
          <div><dt>{t("Check-in / out", "入住 / 退房")}</dt><dd>{profile?.checkin || "—"} {t("in", "入住")} / {profile?.checkout || "—"} {t("out", "退房")}</dd></div>
          <div><dt>{t("Listed room rates", "房型挂牌价区间")}</dt><dd>{rateLabel}</dd></div>
        </dl>}
        <button type="button" className="property-edit-profile" onClick={() => setDrawer("profile")}>{readOnly ? t("View full profile", "查看完整资料") : profile ? t("Edit property profile", "编辑民宿资料") : t("Set up your property", "完善民宿资料")} →</button>
      </article>
    </div>
    {selectedRoom && <RoomActions scope={scope} roomId={selectedRoom} zh={zh} readOnly={readOnly} reserved={stays.ready ? status(selectedRoom).reserved : null} onClose={() => setSelectedRoom(null)}/>}
    {drawer && <WorkbenchDrawer title={drawer === "profile" ? t("Property Profile", "民宿基础资料") : drawer === "types" ? t("Room Types & Listed Rates", "房型与挂牌价") : t("Account Settings", "账户设置")} onClose={closeDrawer} canClose={() => !profileDirty || window.confirm(t("Your property edits are not saved. Discard them and close?", "民宿资料尚未保存，放弃修改并关闭吗？"))}>
      {drawer === "profile" ? <PropertyProfileEditor zh={zh} readOnly={readOnly} onDirtyChange={setProfileDirty}/> : drawer === "types" ? <RoomTypesPreview scope={scope} zh={zh}/> : account}
    </WorkbenchDrawer>}
  </div>;
}
