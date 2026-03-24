// ==========================================
// 1. IMPORT (Lấy hết các hàm từ data.js)
// ==========================================
import {
    subscribeToAuth, loginEmail, registerEmail, loginGoogle, logout,
    fetchNews, fetchGuides, fetchForumPosts, createPost,
    fetchAllUsers, fetchMyPosts, defaultConfig, loginUser, deleteUserAndData,
    updateUserProfile, editDocument, registerUser, resetPassword,
    deleteDocument, fetchComments, addComment, deleteComment
} from './core.js';

// Biến toàn cục lưu trạng thái
let currentUser = null;
let currentRole = 'guest';

function showCustomModal(title, message, type = 'info', onConfirm = null) {
    const modal = document.getElementById('global-modal');
    const titleEl = document.getElementById('global-modal-title');
    const msgEl = document.getElementById('global-modal-message');
    const actionsEl = document.getElementById('global-modal-actions');
    const iconEl = document.getElementById('global-modal-icon');
    const modalContent = modal.querySelector('.modal-content');

    // 1. Set nội dung
    titleEl.innerText = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>'); // Hỗ trợ xuống dòng
    actionsEl.innerHTML = ''; // Xóa nút cũ

    // 2. Set Icon & Màu tiêu đề tùy loại
    if (type === 'danger') {
        iconEl.innerText = '⚠️';
        titleEl.className = "text-2xl font-black title-font text-red-500 mb-2";
    } else if (type === 'confirm') {
        iconEl.innerText = '❓';
        titleEl.className = "text-2xl font-black title-font text-yellow-400 mb-2";
    } else {
        iconEl.innerText = '🔔';
        titleEl.className = "text-2xl font-black title-font text-cyan-400 mb-2";
    }

    // 3. Tạo nút bấm
    if (type === 'confirm' || type === 'danger') {
        // Nút Hủy
        const btnCancel = document.createElement('button');
        btnCancel.className = "text-gray-400 hover:text-white font-bold text-sm px-4 py-2 transition";
        btnCancel.innerText = "HỦY BỎ";
        btnCancel.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnCancel);

        // Nút Đồng ý
        const btnOk = document.createElement('button');
        btnOk.className = type === 'danger'
            ? "bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-red-900/50 transition"
            : "cyber-btn px-6 py-2 rounded-lg font-bold text-sm text-white transition";

        btnOk.innerText = type === 'danger' ? "XÓA NGAY" : "ĐỒNG Ý";

        btnOk.onclick = async () => {
            modal.classList.remove('active');
            if (onConfirm) await onConfirm();
        };
        actionsEl.appendChild(btnOk);
    } else {
        // Chỉ hiện nút Đóng (Info/Alert)
        const btnClose = document.createElement('button');
        btnClose.className = "cyber-btn px-8 py-2 rounded-lg font-bold text-sm text-white";
        btnClose.innerText = "ĐÃ HIỂU";
        btnClose.onclick = () => modal.classList.remove('active');
        actionsEl.appendChild(btnClose);
    }

    if (type === 'info') {
        modalContent.classList.add('is-news');
    } else {
        modalContent.classList.remove('is-news');
    }

    // 4. Hiện Modal
    modal.classList.add('active');
}

// ==========================================
// 2. GLOBAL HANDLERS (Gắn vào Window để HTML gọi được)
// ==========================================

// --- Tiện ích ---
window.copyServerIP = () => {
    navigator.clipboard.writeText("cornnetwork.site").then(() => {
        showCustomModal("SERVER IP", "✅ Đã copy IP thành công:\n cornnetwork.site", "info");
    });
};

window.openDiscord = () => {
    window.open("https://discord.gg/cUsA2K4Cpz", "_blank");
};

// --- Chức năng Admin: Quản lý User ---
window.handleRoleChange = async (uid, newRole) => {
    showCustomModal(
        "XÁC NHẬN PHÂN QUYỀN",
        `Bạn có chắc muốn đổi quyền thành viên này sang [${newRole.toUpperCase()}]?`,
        "confirm",
        async () => {
            try {
                await editDocument('users', uid, { role: newRole });
                showCustomModal("THÀNH CÔNG", "✅ Đã cập nhật quyền thành công!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.handleDeleteUser = async (uid, name) => {
    showCustomModal(
        "CẢNH BÁO XÓA USER",
        `⛔ Bạn đang xóa toàn bộ dữ liệu của [${name}]?\nHành động này KHÔNG THỂ khôi phục!`,
        "danger",
        async () => {
            try {
                await deleteUserAndData(uid);
                renderAdminTable();
                showCustomModal("THÀNH CÔNG", "Đã xóa thành viên!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.deletePost = (collectionName, docId) => {
    showCustomModal(
        "XÓA BÀI VIẾT",
        "🗑️ Bạn chắc chắn muốn xóa bài viết này vĩnh viễn?",
        "danger",
        async () => {
            try {
                await deleteDocument(collectionName, docId);
                // Load lại trang tương ứng
                if (collectionName === 'news') renderNews();
                if (collectionName === 'guides') renderGuides();
                if (collectionName === 'forum_posts') {
                    const isPending = document.getElementById('tab-pending')?.classList.contains('active');
                    renderForum(isPending ? 'pending' : 'approved');
                }
                showCustomModal("THÔNG BÁO", "Đã xóa bài viết.", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

window.approvePost = (docId) => {
    showCustomModal(
        "DUYỆT BÀI",
        "✅ Bạn muốn duyệt bài viết này hiển thị công khai?",
        "confirm",
        async () => {
            try {
                await editDocument('forum_posts', docId, { status: 'approved' });
                renderForum('pending');
                showCustomModal("THÀNH CÔNG", "Đã duyệt bài!", "info");
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// --- Chức năng Diễn đàn ---
window.filterForum = (status) => {
    const btnApproved = document.getElementById('tab-approved');
    const btnPending = document.getElementById('tab-pending');
    const btnMine = document.getElementById('tab-mine');

    [btnApproved, btnPending, btnMine].forEach(btn => {
        if (btn) btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
    });

    if (status === 'approved' && btnApproved) {
        btnApproved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (status === 'pending' && btnPending) {
        btnPending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (status === 'mine' && btnMine) {
        btnMine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }
    renderForum(status);
};

window.toggleComments = (postId) => {
    const section = document.getElementById(`comments-section-${postId}`);
    section.classList.toggle('hidden');
    if (!section.classList.contains('hidden')) {
        renderComments(postId);
    }
};

window.sendComment = async (postId) => {
    if (!currentUser) return showCustomModal("YÊU CẦU", "Vui lòng đăng nhập để bình luận!", "info");
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();

    if (!content) return;

    try {
        await addComment(postId, content, currentRole);
        input.value = '';
        renderComments(postId);
    } catch (e) { showCustomModal("LỖI", "Gửi comment thất bại: " + e.message, "danger"); }
};

window.deleteCommentAction = (postId, commentId) => {
    showCustomModal(
        "XÓA BÌNH LUẬN",
        "Bạn muốn xóa bình luận này?",
        "danger",
        async () => {
            try {
                await deleteComment(postId, commentId);
                renderComments(postId);
            } catch (e) { showCustomModal("LỖI", e.message, "danger"); }
        }
    );
};

// ==========================================
// RENDER NEWS 
// ==========================================
async function renderNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    const news = await fetchNews();
    const isStaff = ['admin', 'dev'].includes(currentRole);

    if (news.length === 0) {
        container.innerHTML = `<div class="glass-panel p-6 text-center text-gray-400">Chưa có tin tức nào.</div>`;
        return;
    }

    container.innerHTML = news.map(item => {
        // Xử lý dữ liệu an toàn để đưa vào Modal
        const safeTitle = (item.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        // Nếu có hình ảnh, tự động chèn thẻ img vào đầu nội dung khi hiển thị trong Modal
        let modalContent = item.content || '';
        if (item.imageUrl) {
            modalContent = `<img src="${item.imageUrl}" class="w-full h-auto rounded-lg mb-4 border border-cyan-500/30 shadow-lg"><br>` + modalContent;
        }
        const safeContent = modalContent.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '<br>');

        // Lấy 1 đoạn text ngắn bỏ hết HTML để làm mô tả
        const plainTextDesc = (item.content || '').replace(/<[^>]*>?/gm, '');

        return `
    <div class="glass-panel p-5 rounded-xl forum-post mb-4 border-l-4 border-cyan-500 bg-gradient-to-r from-white/10 to-transparent hover:bg-white/15 transition cursor-pointer group shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
         onclick="window.showCustomModal('${safeTitle}', '${safeContent}', 'info')">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            
            <div class="flex-1 min-w-0"> 
                <div class="flex items-center space-x-3 mb-2">
                    <span class="text-xs text-white bg-purple-600/40 border border-purple-400/30 px-2 rounded shadow-sm">${new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    <span class="bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded text-[10px] font-bold uppercase">${item.category || 'TIN TỨC'}</span>
                </div>
                
                <h3 class="text-xl font-bold title-font text-cyan-100 drop-shadow-md group-hover:text-white transition">${item.title}</h3>
                
                <p class="text-gray-400 text-sm mt-1 line-clamp-2">${plainTextDesc}</p>
            </div>

            <div class="flex flex-col items-end gap-2 flex-shrink-0 border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0 w-full sm:w-auto">
                <span class="text-xs text-gray-400 hidden sm:block">Bởi: <b class="text-cyan-300">${item.author}</b></span>
                <span class="text-cyan-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">ĐỌC CHI TIẾT ➔</span>
                
                ${isStaff ? `<button onclick="event.stopPropagation(); window.deletePost('news', '${item.id}')" class="text-red-400 text-xs hover:text-white font-bold bg-red-900/30 hover:bg-red-600 px-3 py-1.5 rounded border border-red-500/30 mt-1 transition shadow-md">🗑️ XÓA</button>` : ''}
            </div>
        </div>
    </div>
    `}).join('');
}


// ==========================================
// RENDER PLAYER GUIDES (2 CỘT: LỆNH & LUẬT - DẠNG XỔ XUỐNG)
// ==========================================
async function renderGuides() {
    const container = document.getElementById('guide-container');
    if (!container) return;

    // ==========================================
    // 1. DỮ LIỆU BÊN TRÁI: DANH SÁCH LỆNH (COMMANDS)
    // ==========================================
    const commandsData = [
        {
            title: "🌍 Di Chuyển & Dịch Chuyển",
            commands: [
                { cmd: "/spawn", desc: "Dịch chuyển về điểm spawn", color: "yellow" },
                { cmd: "/home <tên>", desc: "Dịch chuyển về nhà", color: "yellow" },
                { cmd: "/sethome <tên>", desc: "Đặt vị trí nhà", color: "yellow" },
                { cmd: "/delhome <tên>", desc: "Xóa nhà", color: "red" },
                { cmd: "/warp <tên>", desc: "Dịch chuyển đến warp", color: "yellow" },
                { cmd: "/rtp", desc: "Dịch chuyển ngẫu nhiên", color: "yellow" },
                { cmd: "/back", desc: "Quay về chỗ chết hoặc vị trí cũ", color: "yellow" }
            ]
        },
        {
            title: "👥 Tương Tác Người Chơi",
            commands: [
                { cmd: "/tpa <tên>", desc: "Gửi yêu cầu dịch chuyển", color: "green" },
                { cmd: "/tpaccept", desc: "Chấp nhận yêu cầu", color: "green" },
                { cmd: "/tpdeny", desc: "Từ chối yêu cầu", color: "red" },
                { cmd: "/msg, /w, /tell <tên>", desc: "Nhắn tin riêng", color: "blue" },
                { cmd: "/pay <tên> <tiền>", desc: "Chuyển tiền cho người khác", color: "purple" },
                { cmd: "/points pay <tên> <xu>", desc: "Chuyển xu cho người khác", color: "purple" }
            ]
        },
        {
            title: "💰 Kinh Tế & Mua Bán",
            commands: [
                { cmd: "/balance, /bal", desc: "Xem số tiền bạn có", color: "yellow" },
                { cmd: "/ah", desc: "Mở chợ đấu giá cộng đồng", color: "orange" },
                { cmd: "/ah sell <giá>", desc: "Bán vật phẩm đang cầm", color: "orange" },
                { cmd: "/shop", desc: "Mở cửa hàng hệ thống", color: "blue" },
                { cmd: "/sellgui", desc: "Mở Menu bán đồ nhanh", color: "blue" },
                { cmd: "/sellall <tên>", desc: "Bán tất cả 1 loại đồ", color: "blue" },
                { cmd: "/rank", desc: "Xem menu mua Rank VIP", color: "cyan" }
            ]
        },
        {
            title: "🛡️ Bảo Vệ Đất (Claim)",
            videoLink: "https://streamable.com/oym4xe",
            commands: [
                { cmd: "/claim", desc: "Tạo vùng bảo vệ (Cần Golden Shovel)", color: "yellow" },
                { cmd: "/claimshop", desc: "Mua thêm Claimblocks", color: "yellow" },
                { cmd: "/unclaim", desc: "Bỏ vùng đất đang đứng", color: "red" },
                { cmd: "/trust <tên>", desc: "Cho phép người khác xây dựng", color: "green" },
                { cmd: "/untrust <tên>", desc: "Thu hồi quyền xây dựng", color: "red" },
                { cmd: "/trustlist", desc: "Xem danh sách người có quyền", color: "cyan" },
                { cmd: "/claimslist", desc: "Xem các vùng bạn đang sở hữu", color: "cyan" }
            ]
        },
        {
            title: "⚙️ Tiện Ích & Biểu Cảm",
            colSpan: true,
            commands: [
                { cmd: "/pv <số>", desc: "Mở kho chứa đồ ảo", color: "purple" },
                { cmd: "/repair", desc: "Sửa vật phẩm đang cầm", color: "purple" },
                { cmd: "/diemdanh", desc: "Nhận thưởng điểm danh hằng ngày", color: "purple" },
                { cmd: "[i]", desc: "Gõ trong chat để show đồ đang cầm", color: "white" },
                { cmd: "[inv]", desc: "Hiển thị toàn bộ kho đồ lên chat", color: "white" },
                { cmd: "/sit", desc: "Ngồi xuống tại chỗ", color: "pink" },
                { cmd: "/lay", desc: "Nằm xuống mặt đất", color: "pink" },
                { cmd: "/crawl", desc: "Bò trườn", color: "pink" },
                { cmd: "/spin", desc: "Xoay vòng vòng", color: "pink" }
            ]
        }
    ];

    // ==========================================
    // 2. DỮ LIỆU BÊN PHẢI: LUẬT MÁY CHỦ (RULES)
    // ==========================================
    // ==========================================
    // 2. DỮ LIỆU BÊN PHẢI: LUẬT MÁY CHỦ (RULES)
    // ==========================================
    const rulesData = [
        {
            title: "🚫 1. Hack/Cheat & Lợi Dụng Lỗi",
            rules: [
                "Được dùng Autoclick cơ bản (spam đánh theo delay) & Freecam (chỉ để xây dựng/quan sát). Cấm dùng macro ngoài game (AutoHotKey, Razer...) để lách luật.",
                "Cấm tuyệt đối mọi loại Hack/Cheat, X-ray, KillAura, Aimbot, Ghost Client hoặc mod ẩn (stealth mode).",
                "Cấm dùng Litematica khi chưa báo Admin. Cấm mọi hành vi dupe item/block.",
                "Cấm trục lợi từ bug game/plugin. Phát hiện lỗi phải báo BQT ngay, giấu giếm sẽ bị Ban vĩnh viễn."
            ]
        },
        {
            title: "⚔️ 2. Gameplay & PvP",
            rules: [
                "PvP ngoài safezone chỉ hợp lệ khi 2 bên tự nguyện. Không kill người trong safezone, spawn.",
                "Cấm phá hoại (Griefing) công trình người khác bằng lava, nước, TNT, hoặc spam entity/hopper gây lag.",
                "Cấm ăn cắp đồ, cấm lợi dụng quyền trust/nhờ mượn đồ để chiếm đoạt (Xử lý theo log).",
                "Cấm trap/bait người chơi để giết lấy đồ (bao gồm AFK trap).",
                "Cấm dùng nhiều tài khoản (clone/alt) để lấy kit, vote, event hoặc treo AFK farm."
            ]
        },
        {
            title: "🏡 3. Xây Dựng Farm & Base",
            rules: [
                "Xây dựng tự do, nhưng CẤM xây lag machine, redstone clock làm giảm TPS server.",
                "Nếu farm gây lag (Staff đo bằng TPS/Spark), phải tắt ngay khi được nhắc nhở. Cố tình tái phạm sẽ bị xóa farm không báo trước.",
                "Cấm xây công trình phản cảm, 18+, phân biệt chủng tộc hoặc liên quan đến chính trị.",
                "Server không đảm bảo đền bù/restore mọi trường hợp; chỉ xem xét khi có log rõ ràng."
            ]
        },
        {
            title: "👮 4. Hành Xử Với BQT (Staff/Admin)",
            rules: [
                "Tôn trọng người chơi và BQT. Không xúc phạm, cãi vã hay gây rối.",
                "Không năn nỉ xin quyền OP, Fly, Creative, xin items hoặc hối lộ BQT.",
                "Cấm chụp/cắt ghép log, ảnh giả để bôi nhọ Staff.",
                "Nghi ngờ Staff lạm quyền? Hãy khiếu nại lên Owner kèm bằng chứng (ảnh, log, video)."
            ]
        },
        {
            title: "💸 5. Giao Dịch & Mua Bán",
            rules: [
                "Chỉ giao dịch bằng tiền tệ/vật phẩm IN-GAME. Cấm giao dịch bằng tiền thật (VNĐ/Tiền ảo). Vi phạm Ban vĩnh viễn.",
                "Cấm giao dịch liên server, qua trung gian ngoài hệ thống, hoặc lập chợ đen.",
                "Cấm trade giftcode/thẻ cào giữa người chơi (Chỉ được Donate trực tiếp).",
                "Cấm Scam (lừa đảo). Cấm bán slot top, thuê cày hộ."
            ]
        },
        {
            title: "🔐 6. Quyền Riêng Tư & Bảo Mật",
            rules: [
                "Không chia sẻ tài khoản. Tự chịu trách nhiệm nếu người dùng chung acc vi phạm luật.",
                "Bị hack hoặc quên mật khẩu: Báo ngay cho Admin kèm thông tin chứng minh để khôi phục.",
                "Cấm chia sẻ/đe dọa công khai thông tin cá nhân của người khác (Doxxing).",
                "Cấm phát tán hình ảnh, tin nhắn riêng tư khi chưa được cho phép."
            ]
        },
        {
            title: "💬 7. Kênh Chat & Discord",
            rules: [
                "Không spam tin nhắn, spam lệnh, tag BQT vô cớ. Mở Ticket xong phải đóng.",
                "Không chửi bới, phân biệt vùng miền, tôn giáo, chính trị, gửi nội dung 18+.",
                "Cấm nhắc tên/IP server khác. Cấm gửi link ngoài, link rút gọn, file chứa mã độc.",
                "Cấm lách filter chat (VD: h@ck). Cấm spam đổi tên, spam emoji, spam join/leave voice.",
                "Phải vào Discord/Box để cập nhật thông báo. Không giải quyết nếu bạn bỏ lỡ thông báo server."
            ]
        },
        {
            title: "🎭 8. Mạo Danh & Quảng Cáo",
            rules: [
                "Cấm giả mạo BQT hoặc người chơi khác để lừa đảo.",
                "Cấm quảng cáo server ngoài, hack/cheat hoặc dịch vụ cày thuê.",
                "Cấm lôi kéo người chơi sang group khác hoặc DM nhắn tin rác qua Discord."
            ]
        },
        {
            title: "🏆 9. Event & Đua Top",
            rules: [
                "Mỗi người CHỈ dùng 1 tài khoản chính tham gia event.",
                "Cấm dùng acc clone để buff, giữ đồ, farm phụ, chuyển tài nguyên... tính là vi phạm.",
                "Cấm lợi dụng bug/hack hoặc thuê người cày top. Vi phạm tước quyền và phạt nặng."
            ]
        },
        {
            title: "⚖️ 10. Hệ Thống Hình Phạt",
            rules: [
                "Mức độ: Cảnh cáo/Mute/Jail ➔ Ban 1/3/7/45 ngày ➔ Ban Vĩnh Viễn.",
                "Phạt song song (MC & Discord). Lách luật bằng alt bị phạt Gấp Đôi.",
                "Lần đầu: Ban Acc (Được tạo acc mới chơi lại nhưng cấm nhận quà tân thủ/event).",
                "Tạo acc mới để tiếp tục phá/hack: BAN IP VÀ HARDWARE toàn bộ tài khoản.",
                "Staff có quyền xử lý các hành vi phá hoại chưa có trong luật. Chơi là mặc định đồng ý luật, không chấp nhận lý do 'Chưa đọc luật'!"
            ]
        }
    ];

    const colorMap = {
        "yellow": "text-yellow-400 border-yellow-500/30",
        "red": "text-red-400 border-red-500/30",
        "green": "text-green-400 border-green-500/30",
        "blue": "text-blue-400 border-blue-500/30",
        "purple": "text-purple-400 border-purple-500/30",
        "orange": "text-orange-400 border-orange-500/30",
        "cyan": "text-cyan-400 border-cyan-500/30",
        "white": "text-white border-gray-500/30"
    };

    // ==========================================
    // 3. TẠO HTML CHO CỘT LỆNH
    // ==========================================
    let commandsHtml = `
        <div class="space-y-4">
            <h3 class="text-3xl font-black title-font text-cyan-400 mb-6 flex items-center gap-3 border-b border-cyan-500/30 pb-3">
                <span class="text-4xl">📚</span> DANH SÁCH LỆNH
            </h3>
            ${commandsData.map(group => `
                <div class="glass-panel rounded-2xl border border-purple-500/30 overflow-hidden shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition select-none group"
                         onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');">
                        <h4 class="text-xl font-bold text-white title-font group-hover:text-cyan-300 transition-colors">${group.title}</h4>
                        <span class="toggle-icon text-cyan-400 font-bold transition-transform duration-300">▼</span>
                    </div>
                    
                    <div class="hidden p-5 border-t border-white/5 bg-black/40 space-y-3">
                        ${group.commands.map(cmd => `
                            <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                <code class="${colorMap[cmd.color] || colorMap['white']} bg-black/50 px-3 py-1.5 rounded font-mono border whitespace-nowrap text-sm shadow-sm">${cmd.cmd}</code>
                                <span class="text-gray-300 text-left xl:text-right flex-1 text-sm">${cmd.desc}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // ==========================================
    // 4. TẠO HTML CHO CỘT LUẬT
    // ==========================================
    let rulesHtml = `
        <div class="space-y-4 mt-12 lg:mt-0">
            <h3 class="text-3xl font-black title-font text-red-400 mb-6 flex items-center gap-3 border-b border-red-500/30 pb-3">
                <span class="text-4xl">⚖️</span> LUẬT MÁY CHỦ
            </h3>
            ${rulesData.map(group => `
                <div class="glass-panel rounded-2xl border border-red-500/30 overflow-hidden shadow-[0_0_15px_rgba(248,113,113,0.1)]">
                    <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition select-none group"
                         onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-180');">
                        <h4 class="text-xl font-bold text-red-100 title-font group-hover:text-red-300 transition-colors">${group.title}</h4>
                        <span class="toggle-icon text-red-400 font-bold transition-transform duration-300">▼</span>
                    </div>
                    
                    <div class="hidden p-5 border-t border-red-500/10 bg-red-950/20 space-y-3">
                        ${group.rules.map(rule => `
                            <div class="flex items-start gap-3">
                                <span class="text-red-500 mt-0.5 text-lg">▪</span>
                                <span class="text-gray-200 text-sm leading-relaxed">${rule}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // ==========================================
    // 5. GỘP CẢ 2 CỘT VÀ IN RA MÀN HÌNH
    // ==========================================
    container.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            ${commandsHtml}
            ${rulesHtml}
        </div>
    `;

    // Gỡ class 'grid-cols-1 md:grid-cols-2' cũ của container ngoài HTML để tránh bị lồng grid
    container.className = "";
}

// ==========================================
// RENDER 4 BẢNG XẾP HẠNG (CHIA TAB)
// ==========================================
// ==========================================
// RENDER 5 BẢNG XẾP HẠNG (CHIA TAB)
// ==========================================
async function renderRanking() {
    const container = document.getElementById('ranking-container');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-12"><div class="loader-ring w-12 h-12 mx-auto mb-4"></div><p class="text-cyan-400 font-bold neon-text animate-pulse">Đang tải dữ liệu từ máy chủ...</p></div>';

    const exportID = "vrWvFmL9ef1scbZd"; // ID Bytebin của bạn
    const rawDataUrl = `https://bytebin.ajg0702.us/${exportID}`;

    try {
        const response = await fetch(rawDataUrl);
        const data = await response.json();

        // 1. LẤY DỮ LIỆU ĐỘNG TỪ API VÀ SẮP XẾP
        const moneyBoard = (data["vault_eco_balance"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        const onlineBoard = (data["statistic_time_played"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        const pointBoard = (data["playerpoints_points"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));
        const killBoard = (data["statistic_player_kills"] || []).sort((a, b) => (b.value || 0) - (a.value || 0));

        // 2. DỮ LIỆU TOP DONATE (Nhập thủ công)
        const donateData = [
            { namecache: "Glenn1", value: 2600000 },
            { namecache: "PE_Dellcotenok", value: 2225000 },
            { namecache: "PE_PopOcean46064", value: 900000 },
            { namecache: "Timmythanh007", value: 860000 },
            { namecache: "luan198348", value: 820000 },
            { namecache: "Ghast", value: 500000+2000000 },
            { namecache: "ShaMein", value: 450000 },
            { namecache: "NgiPam_06", value: 431000 },
            { namecache: "Trungvippro", value: 420000 },
            { namecache: "LaShan", value: 200000 },
            { namecache: "PE_Mine8889672", value: 200000 },
            { namecache: "CharlesTwoK", value: 170000 },
            { namecache: "Sunnn06", value: 150000 },
            { namecache: "111s", value: 100000 },
            { namecache: "Haiyen01", value: 100000 },
            { namecache: "68_Hazy", value: 100000 },
            { namecache: "Hazon1409", value: 85000 },
            { namecache: "Yuna_Gaming", value: 70000 },
            { namecache: "ScuHq", value: 50000 },
            { namecache: "PE_Huyvippto6584", value: 50000 },
            { namecache: "Kazuto207", value: 49000 },
            { namecache: "Setroit", value: 30000 },
            { namecache: "CuCoMuiKhai", value: 30000 },
            { namecache: "linhcute2006", value: 25000 },
            { namecache: "lehiepmc", value: 20000 },
            { namecache: "sangvu", value: 15000 },
            {  namecache: "linhcute2006", value: 1168000+1050000 },
            { namecache: "DraWind000", value: 250000 },
            { namecache: "huy_holow", value: 230000 }
        ];
        // Sắp xếp tự động từ cao xuống thấp
        const donateBoard = donateData.sort((a, b) => b.value - a.value);

        // 3. TẠO KHUNG HTML CHỨA CÁC NÚT BẤM CHUYỂN TAB
        let html = `
        <div class="flex flex-wrap justify-center gap-3 mb-8">
            <button onclick="window.switchRankTab('donate')" id="tab-btn-donate" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-pink-600/20 text-pink-400 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]">💖 TOP DONATE</button>
            <button onclick="window.switchRankTab('money')" id="tab-btn-money" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">💰 ĐẠI GIA</button>
            <button onclick="window.switchRankTab('online')" id="tab-btn-online" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">⏳ CHĂM CHỈ</button>
            <button onclick="window.switchRankTab('point')" id="tab-btn-point" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">💎 TOP XU</button>
            <button onclick="window.switchRankTab('kill')" id="tab-btn-kill" class="px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10">⚔️ SÁT THỦ</button>
        </div>
        <div class="relative w-full max-w-2xl mx-auto">
        `;

        const renderBoard = (tabId, title, boardData, prefix, suffix, colorClass, borderGlow, isHidden, limit = 10, useShortFormat = false) => {
            let boardHtml = `<div id="board-${tabId}" class="rank-board ${isHidden ? 'hidden' : ''} glass-intense p-4 sm:p-6 rounded-2xl border ${borderGlow} shadow-[0_0_30px_rgba(0,0,0,0.2)] relative overflow-hidden group transition-all duration-300">`;
            boardHtml += `<div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>`;
            boardHtml += `<h3 class="text-2xl font-black title-font text-center mb-6 ${colorClass} drop-shadow-md relative z-10">${title}</h3>`;
            boardHtml += `<div class="space-y-3 relative z-10">`;

            if (boardData.length === 0) {
                boardHtml += `<div class="text-center py-8 text-gray-500 italic text-sm">Chưa có dữ liệu</div>`;
            } else {
                // Cắt danh sách theo limit truyền vào
                const topList = boardData.slice(0, limit);
                topList.forEach((player, index) => {
                    let numVal = parseFloat(player.value || 0);
                    let val = "";
                    
                    // Xử lý làm ngắn gọn số tiền
                    if (useShortFormat) {
                        if (numVal >= 1000000000) val = (numVal / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
                        else if (numVal >= 1000000) val = (numVal / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                        else if (numVal >= 1000) val = (numVal / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                        else val = numVal.toLocaleString('vi-VN');
                    } else {
                        val = numVal.toLocaleString('vi-VN');
                    }

                    let playerName = player.namecache || "Ẩn danh";

                    let medal = `#${index + 1}`;
                    let medalClass = "text-gray-400 text-base font-bold";
                    let rowBorder = "border-white/10";

                    if (index === 0) { medal = '🥇'; medalClass = "text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"; rowBorder = "border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-transparent"; }
                    else if (index === 1) { medal = '🥈'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]"; rowBorder = "border-gray-300/50 bg-gradient-to-r from-gray-400/20 to-transparent"; }
                    else if (index === 2) { medal = '🥉'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]"; rowBorder = "border-orange-400/50 bg-gradient-to-r from-orange-600/20 to-transparent"; }

                    boardHtml += `
                    <div class="glass-panel p-3 rounded-xl flex items-center justify-between border-l-4 ${rowBorder} hover:bg-white/10 hover:scale-[1.02] transition-all cursor-default">
                        <div class="flex items-center gap-3 sm:gap-4">
                            <div class="w-10 text-center ${medalClass} title-font">${medal}</div>
                            <div class="relative">
                                <img src="https://mc-heads.net/avatar/${playerName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-white/20 bg-gray-900 object-cover shadow-md">
                                ${index === 0 ? '<div class="absolute -top-3 -right-2 text-lg">👑</div>' : ''}
                            </div>
                            <span class="font-bold text-white text-base sm:text-xl tracking-wide">${playerName}</span>
                        </div>
                        <div class="text-right">
                            <span class="${colorClass} font-black text-lg sm:text-2xl drop-shadow-sm">${prefix}${val}${suffix}</span>
                        </div>
                    </div>`;
                });
            }
            boardHtml += `</div></div>`;
            return boardHtml;
        };

        // // Hàm hỗ trợ vẽ 1 bảng
        // const renderBoard = (tabId, title, boardData, prefix, suffix, colorClass, borderGlow, isHidden) => {
        //     let boardHtml = `<div id="board-${tabId}" class="rank-board ${isHidden ? 'hidden' : ''} glass-intense p-4 sm:p-6 rounded-2xl border ${borderGlow} shadow-[0_0_30px_rgba(0,0,0,0.2)] relative overflow-hidden group transition-all duration-300">`;
        //     boardHtml += `<div class="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>`;
        //     boardHtml += `<h3 class="text-2xl font-black title-font text-center mb-6 ${colorClass} drop-shadow-md relative z-10">${title}</h3>`;
        //     boardHtml += `<div class="space-y-3 relative z-10">`;

        //     if (boardData.length === 0) {
        //         boardHtml += `<div class="text-center py-8 text-gray-500 italic text-sm">Chưa có dữ liệu</div>`;
        //     } else {
        //         const top10 = boardData.slice(0, 10);
        //         top10.forEach((player, index) => {
        //             let val = parseFloat(player.value || 0).toLocaleString('vi-VN');
        //             let playerName = player.namecache || "Ẩn danh";

        //             let medal = `#${index + 1}`;
        //             let medalClass = "text-gray-400 text-base font-bold";
        //             let rowBorder = "border-white/10";

        //             if (index === 0) { medal = '🥇'; medalClass = "text-3xl drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"; rowBorder = "border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-transparent"; }
        //             else if (index === 1) { medal = '🥈'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(148,163,184,0.8)]"; rowBorder = "border-gray-300/50 bg-gradient-to-r from-gray-400/20 to-transparent"; }
        //             else if (index === 2) { medal = '🥉'; medalClass = "text-2xl drop-shadow-[0_0_8px_rgba(180,83,9,0.8)]"; rowBorder = "border-orange-400/50 bg-gradient-to-r from-orange-600/20 to-transparent"; }

        //             boardHtml += `
        //             <div class="glass-panel p-3 rounded-xl flex items-center justify-between border-l-4 ${rowBorder} hover:bg-white/10 hover:scale-[1.02] transition-all cursor-default">
        //                 <div class="flex items-center gap-3 sm:gap-4">
        //                     <div class="w-10 text-center ${medalClass} title-font">${medal}</div>
        //                     <div class="relative">
        //                         <img src="https://mc-heads.net/avatar/${playerName}" class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-white/20 bg-gray-900 object-cover shadow-md">
        //                         ${index === 0 ? '<div class="absolute -top-3 -right-2 text-lg">👑</div>' : ''}
        //                     </div>
        //                     <span class="font-bold text-white text-base sm:text-xl tracking-wide">${playerName}</span>
        //                 </div>
        //                 <div class="text-right">
        //                     <span class="${colorClass} font-black text-lg sm:text-2xl drop-shadow-sm">${prefix}${val}${suffix}</span>
        //                 </div>
        //             </div>`;
        //         });
        //     }
        //     boardHtml += `</div></div>`;
        //     return boardHtml;
        // };

        // 4. VẼ 5 BẢNG VÀO HTML (Mặc định hiện TOP DONATE, ẩn 4 Top còn lại)
        html += renderBoard("donate", "💖 BẢNG VÀNG DONATE", donateBoard, "", " VNĐ", "text-pink-400", "border-pink-500/20", false, 20, false);
        html += renderBoard("money", "💰 TOP ĐẠI GIA", moneyBoard, "$", "", "text-green-400", "border-green-500/20", true, 10, true);
        html += renderBoard("online", "⏳ TOP CHĂM CHỈ", onlineBoard, "", " Giờ", "text-cyan-400", "border-cyan-500/20", true);
        html += renderBoard("point", "💎 TOP ĐẠI GIA XU", pointBoard, "", " Xu", "text-yellow-400", "border-yellow-500/20", true);
        html += renderBoard("kill", "⚔️ TOP SÁT THỦ", killBoard, "", " Kill", "text-red-400", "border-red-500/20", true);

        html += '</div>'; // Đóng div max-w-2xl

        container.classList.remove('max-w-7xl');
        container.classList.add('max-w-3xl');
        container.innerHTML = html;

    } catch (error) {
        console.error("Lỗi tải Ranking:", error);
        container.innerHTML = '<div class="text-red-500 text-center glass-panel p-6 border border-red-500/30 rounded-xl">❌ Lỗi kết nối đến dữ liệu máy chủ. Vui lòng thử lại sau!</div>';
    }
}

// ==========================================
// HÀM CHUYỂN TAB RANKING
// ==========================================
window.switchRankTab = (tabName) => {
    // 1. Ẩn tất cả các bảng
    document.querySelectorAll('.rank-board').forEach(el => el.classList.add('hidden'));

    // 2. Hiện bảng vừa được chọn
    const activeBoard = document.getElementById(`board-${tabName}`);
    if (activeBoard) activeBoard.classList.remove('hidden');

    // 3. Reset style tất cả các nút bấm về màu xám mờ
    ['donate', 'money', 'online', 'point', 'kill'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) btn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10';
    });

    // 4. Bật sáng nút bấm vừa được chọn với màu tương ứng
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        if (tabName === 'donate') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-pink-600/20 text-pink-400 border border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]';
        } else if (tabName === 'money') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-green-600/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
        } else if (tabName === 'online') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
        } else if (tabName === 'point') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
        } else if (tabName === 'kill') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-red-600/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(248,113,113,0.3)]';
        }
    }
};

// ==========================================
// HÀM CHUYỂN TAB RANKING
// ==========================================
window.switchRankTab = (tabName) => {
    // 1. Ẩn tất cả các bảng
    document.querySelectorAll('.rank-board').forEach(el => el.classList.add('hidden'));

    // 2. Hiện bảng vừa được chọn
    const activeBoard = document.getElementById(`board-${tabName}`);
    if (activeBoard) activeBoard.classList.remove('hidden');

    // 3. Reset style tất cả các nút bấm về màu xám mờ
    ['money', 'online', 'point', 'kill'].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) btn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10';
    });

    // 4. Bật sáng nút bấm vừa được chọn với màu tương ứng
    const activeBtn = document.getElementById(`tab-btn-${tabName}`);
    if (activeBtn) {
        if (tabName === 'money') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-green-600/20 text-green-400 border border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]';
        } else if (tabName === 'online') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]';
        } else if (tabName === 'point') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-yellow-600/20 text-yellow-400 border border-yellow-500/50 shadow-[0_0_15px_rgba(250,204,21,0.3)]';
        } else if (tabName === 'kill') {
            activeBtn.className = 'px-5 py-2.5 rounded-xl font-bold text-sm transition bg-red-600/20 text-red-400 border border-red-500/50 shadow-[0_0_15px_rgba(248,113,113,0.3)]';
        }
    }
};

// ==========================================
// CẬP NHẬT TRẠNG THÁI SERVER (SỐ NGƯỜI CHƠI)
// ==========================================
async function updateServerStatus() {
    const apiUrl = `https://api.mcsrvstat.us/2/45.117.164.93:25626`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const statOnlineEl = document.getElementById('stat-online');
        const navOnlineEl = document.getElementById('nav-online');
        const statVersionEl = document.getElementById('stat-peak');
        const statusDot = document.querySelector('.status-dot');

        if (data.online === true) {
            // 1. LẤY SỐ NGƯỜI ONLINE: data.players.online (Trong JSON của bạn là 20)
            const currentPlayers = data.players.online || 0;

            if (statOnlineEl) statOnlineEl.innerText = currentPlayers;

            if (navOnlineEl) {
                navOnlineEl.innerHTML = `<span class="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">${currentPlayers}</span>`;
            }

            // Chấm tròn xanh trạng thái
            if (statusDot) {
                statusDot.style.background = '#4ade80';
                statusDot.style.boxShadow = '0 0 10px #4ade80';
            }

            // 2. LẤY PHIÊN BẢN: data.version (Trong JSON là "Leaf 1.21.8")
            if (statVersionEl && data.version) {
                const versionString = data.version;
                // Regex lọc lấy số (ví dụ: 1.21.8)
                const cleanVersion = versionString.match(/\d+\.\d+(\.\d+)?/);
                statVersionEl.innerText = cleanVersion ? cleanVersion[0] : versionString;
            }

        } else {
            // Xử lý khi Offline
            if (statOnlineEl) statOnlineEl.innerText = "OFF";
            if (navOnlineEl) navOnlineEl.innerHTML = `<span class="text-red-400">OFFLINE</span>`;
            if (statusDot) {
                statusDot.style.background = '#f87171';
                statusDot.style.boxShadow = '0 0 10px #f87171';
            }
        }
    } catch (error) {
        console.error("Lỗi kết nối API Server:", error);
    }
}
async function renderForum(filterMode = 'approved') {
    // filterMode có 3 dạng: 'approved' (chung), 'pending' (admin duyệt), 'mine' (bài của tôi)

    const container = document.getElementById('forum-container');
    if (!container) return;

    // 1. VẼ THANH TAB (Tùy theo quyền hạn)
    if (!document.getElementById('forum-tabs')) {
        let tabsHTML = `
        <div id="forum-tabs" class="flex flex-wrap gap-3 mb-6">
            <button id="tab-approved" onclick="window.filterForum('approved')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-cyan-500/30 bg-cyan-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                🌐 CỘNG ĐỒNG
            </button>`;

        // Nếu là Admin/Dev -> Hiện tab Duyệt bài
        if (['admin', 'dev', 'helper'].includes(currentRole)) {
            tabsHTML += `
            <button id="tab-pending" onclick="window.filterForum('pending')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-yellow-500/30 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10">
                🛡️ KHO DUYỆT BÀI ⚠️
            </button>`;
        }

        // Nếu đã đăng nhập (bất kể role nào) -> Hiện tab Bài của tôi
        if (currentUser) {
            tabsHTML += `
            <button id="tab-mine" onclick="window.filterForum('mine')" 
                class="px-5 py-2 rounded-lg font-bold text-sm transition border border-purple-500/30 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10">
                👤 BÀI CỦA TÔI
            </button>`;
        }

        tabsHTML += `</div><div id="forum-list" class="space-y-4"></div>`;
        container.innerHTML = tabsHTML;
    }

    // 2. CẬP NHẬT TRẠNG THÁI NÚT BẤM (Active State)
    const buttons = {
        'approved': document.getElementById('tab-approved'),
        'pending': document.getElementById('tab-pending'),
        'mine': document.getElementById('tab-mine')
    };

    // Reset style tất cả nút
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.className = "px-5 py-2 rounded-lg font-bold text-sm transition border border-gray-700 text-gray-400 hover:bg-white/5";
        }
    });

    // Highlight nút đang chọn
    if (filterMode === 'approved' && buttons.approved) {
        buttons.approved.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.5)] border border-cyan-400";
    } else if (filterMode === 'pending' && buttons.pending) {
        buttons.pending.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-yellow-600 text-white shadow-[0_0_10px_rgba(202,138,4,0.5)] border border-yellow-400";
    } else if (filterMode === 'mine' && buttons.mine) {
        buttons.mine.className = "px-5 py-2 rounded-lg font-bold text-sm transition bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)] border border-purple-400";
    }

    // 3. LẤY DỮ LIỆU
    const listContainer = document.getElementById('forum-list');
    listContainer.innerHTML = '<div class="text-center py-8"><div class="loader-ring w-8 h-8 mx-auto"></div><p class="text-xs text-gray-500 mt-2">Đang tải dữ liệu...</p></div>';

    let posts = [];
    try {
        if (filterMode === 'mine' && currentUser) {
            posts = await fetchMyPosts(currentUser.uid);
        } else {
            // Nếu filter là 'pending' nhưng user ko phải admin -> Ép về 'approved' để bảo mật
            if (filterMode === 'pending' && !['admin', 'dev'].includes(currentRole)) filterMode = 'approved';
            posts = await fetchForumPosts(filterMode);
        }
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<div class="text-red-500 text-center">Lỗi tải dữ liệu. (Có thể cần tạo Index Firestore)</div>`;
        return;
    }

    const isStaff = ['admin', 'dev'].includes(currentRole);

    if (posts.length === 0) {
        let emptyMsg = "Chưa có bài viết nào.";
        if (filterMode === 'pending') emptyMsg = "Tuyệt vời! Đã duyệt hết bài.";
        if (filterMode === 'mine') emptyMsg = "Bạn chưa đăng bài viết nào.";

        listContainer.innerHTML = `<div class="glass-panel p-8 text-center text-gray-500 italic border border-dashed border-gray-700 rounded-xl">${emptyMsg}</div>`;
        return;
    }

    // 4. RENDER DANH SÁCH
    listContainer.innerHTML = posts.map(post => {
        const isOwner = currentUser && currentUser.uid === post.authorId;
        const canDelete = isStaff || isOwner;

        // Logic hiển thị Badge trạng thái (Cho tab Bài của tôi)
        let statusBadge = '';
        if (filterMode === 'mine') {
            if (post.status === 'approved') statusBadge = `<span class="bg-green-500/20 text-green-400 border border-green-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold">✅ Đã duyệt</span>`;
            else statusBadge = `<span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 text-[10px] px-2 py-0.5 rounded uppercase font-bold">⏳ Đang chờ</span>`;
        }

        return `
        <div class="glass-panel p-6 rounded-xl forum-post hover:bg-white/5 transition relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition"></div>

            <div class="flex items-start space-x-4">
                <img src="${post.avatar || `https://mc-heads.net/avatar/${post.author}`}" class="w-12 h-12 rounded-lg border border-purple-500/30 shadow-sm bg-gray-900 object-cover">
                <div class="flex-1 w-full min-w-0">
                    <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
                        <div class="flex items-center gap-2">
                            <h4 class="font-bold title-font text-white truncate max-w-[150px] sm:max-w-xs">${post.author}</h4>
                            <span class="text-[10px] bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-400">${post.authorRole || 'Member'}</span>
                            ${statusBadge}
                        </div>
                        <span class="text-xs text-purple-300/70 font-mono">${new Date(post.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                    
                    <h3 class="text-lg sm:text-xl font-bold title-font mb-2 text-cyan-200 break-words">${post.title}</h3>
                    <div class="text-purple-100/80 text-sm mb-4 whitespace-pre-line bg-black/20 p-3 rounded-lg border border-white/5 overflow-hidden break-words">${post.content}</div>
                    
                    <div class="flex items-center justify-between border-t border-gray-700/50 pt-3 mt-2">
                        <button onclick="window.toggleComments('${post.id}')" class="text-xs sm:text-sm text-gray-400 hover:text-cyan-400 transition flex items-center gap-2 group-btn">
                            <span class="group-btn-hover:scale-110 transition">💬</span> Bình luận
                        </button>
                        
                        <div class="flex gap-2">
                            ${filterMode === 'pending' && isStaff ? `<button onclick="window.approvePost('${post.id}')" class="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold shadow-lg shadow-green-900/20">✅ DUYỆT NGAY</button>` : ''}
                            ${canDelete ? `<button onclick="window.deletePost('forum_posts', '${post.id}')" class="text-red-500 hover:text-red-300 text-xs font-bold border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded transition">🗑️ Xóa</button>` : ''}
                        </div>
                    </div>

                    <div id="comments-section-${post.id}" class="hidden mt-4 pl-0 sm:pl-4 border-l-0 sm:border-l-2 border-purple-500/20">
                        <div id="comments-list-${post.id}" class="space-y-3 mb-3 max-h-60 overflow-y-auto custom-scrollbar p-1"></div>
                        ${currentUser ? `
                        <div class="flex gap-2 relative">
                            <input type="text" id="comment-input-${post.id}" class="cyber-input w-full px-4 py-2 rounded-full text-sm pr-10" placeholder="Viết bình luận..." onkeydown="if(event.key==='Enter') window.sendComment('${post.id}')">
                            <button onclick="window.sendComment('${post.id}')" class="absolute right-1 top-1 bg-cyan-600 hover:bg-cyan-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition">➤</button>
                        </div>` : '<p class="text-xs text-gray-500 italic bg-black/30 p-2 rounded text-center">Đăng nhập để tham gia thảo luận.</p>'}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

async function renderComments(postId) {
    const container = document.getElementById(`comments-list-${postId}`);
    container.innerHTML = '<div class="text-xs text-gray-500">Đang tải...</div>';

    try {
        const comments = await fetchComments(postId);
        const isStaff = ['admin', 'dev'].includes(currentRole);

        if (comments.length === 0) {
            container.innerHTML = '<div class="text-xs text-gray-600 italic">Chưa có bình luận nào.</div>';
            return;
        }

        container.innerHTML = comments.map(c => {
            const isOwner = currentUser && currentUser.uid === c.uid;
            const canDel = isStaff || isOwner;
            return `
            <div class="flex gap-3">
                <img src="${c.avatar}" class="w-6 h-6 rounded-full border border-gray-600">
                <div class="bg-gray-800/50 rounded-lg px-3 py-2 w-full border border-gray-700">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="text-xs font-bold text-cyan-400">${c.username}</span>
                        <div class="flex gap-2 items-center">
                            <span class="text-[10px] text-gray-500">${new Date(c.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ${canDel ? `<button onclick="window.deleteCommentAction('${postId}', '${c.id}')" class="text-red-500 hover:text-white text-[10px]">✕</button>` : ''}
                        </div>
                    </div>
                    <p class="text-sm text-gray-300">${c.content}</p>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error(e); }
}

async function renderAdminTable() {
    const tbody = document.getElementById('admin-user-table-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-purple-300">⏳ Đang tải dữ liệu...</td></tr>';

    try {
        const users = await fetchAllUsers();
        document.getElementById('total-users-count').innerText = users.length;

        tbody.innerHTML = users.map(u => {
            const isMe = currentUser && currentUser.uid === u.id;
            const avatar = u.photoURL || `https://mc-heads.net/avatar/${u.username}`;
            const roles = ['member', 'vip', 'media', 'helper', 'dev', 'admin'];

            return `
            <tr class="hover:bg-white/5 transition border-b border-purple-500/10 user-row">
                <td class="p-4 flex items-center gap-3">
                    <img src="${avatar}" class="w-8 h-8 rounded border border-purple-500/30">
                    <div>
                        <div class="font-bold text-white text-sm">${u.username} ${isMe ? '<span class="text-cyan-400">(Bạn)</span>' : ''}</div>
                    </div>
                </td>
                <td class="p-4 text-gray-400 text-xs">${u.email}</td>
                <td class="p-4 text-gray-400 text-xs">${u.joinedAt ? new Date(u.joinedAt.seconds * 1000).toLocaleDateString() : 'N/A'}</td>
                <td class="p-4">
                    <select onchange="window.handleRoleChange('${u.id}', this.value)" class="bg-black/50 border border-purple-500/30 text-xs text-white rounded px-2 py-1 outline-none">
                        ${roles.map(r => `<option value="${r}" ${u.role === r ? 'selected' : ''} class="bg-gray-900">${r.toUpperCase()}</option>`).join('')}
                    </select>
                </td>
                <td class="p-4 text-center">
                    ${!isMe ? `<button onclick="window.handleDeleteUser('${u.id}', '${u.username}')" class="text-red-500 hover:text-white bg-red-500/10 p-1.5 rounded">🗑️</button>` : ''}
                </td>
            </tr>`;
        }).join('');
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" class="text-red-500 text-center">Lỗi: ${e.message}</td></tr>`; }
}

// ==========================================
// 4. AUTH & INIT (Khởi động)
// ==========================================

// Chuyển đổi giữa các form Login / Register / Forgot
window.switchAuthForm = (formId) => {
    document.querySelectorAll('.auth-form').forEach(el => el.classList.add('hidden'));
    document.getElementById(`form-${formId}`).classList.remove('hidden');
};

function setupAuthForms() {
    // Login
    document.getElementById('email-login-form').onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;
        try {
            await loginEmail(input, pass);
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng nhập thất bại: " + err.message); }
    };

    // Register
    document.getElementById('email-register-form').onsubmit = async (e) => {
        e.preventDefault();
        const user = document.getElementById('reg-username').value;
        const pass = document.getElementById('reg-pass').value;
        try {
            await registerEmail(user, pass);
            alert("Đăng ký thành công!");
            document.getElementById('auth-modal').classList.remove('active');
        } catch (err) { alert("Đăng ký lỗi: " + err.message); }
    };

    // Forgot Password
    document.getElementById('forgot-pass-form').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('forgot-email').value;
        try {
            await resetPassword(email);
            alert("Đã gửi email khôi phục mật khẩu. Vui lòng kiểm tra hộp thư!");
            window.switchAuthForm('login');
        } catch (err) { alert("Lỗi: " + err.message); }
    };

    // Google
    document.getElementById('google-login-btn').onclick = async () => {
        try { await loginGoogle(); document.getElementById('auth-modal').classList.remove('active'); }
        catch (e) { alert(e.message); }
    };
}

function handleAuthUI(user, role) {
    currentUser = user;
    currentRole = role;
    const authDisplay = document.getElementById('auth-display');

    if (user) {
        // 1. XỬ LÝ GIAO DIỆN ĐĂNG NHẬP
        const avatar = user.photoURL || `https://mc-heads.net/avatar/${user.displayName}`;
        authDisplay.innerHTML = `
            <div class="relative group z-50">
                <button class="flex items-center gap-2 glass-panel px-3 py-1.5 rounded-full hover:bg-white/10 transition border border-cyan-400/30">
                    <img src="${avatar}" class="w-8 h-8 rounded-full border border-cyan-400 object-cover">
                    <div class="text-left hidden sm:block">
                        <div class="text-sm font-bold text-white leading-none">${user.displayName}</div>
                        <div class="text-[10px] text-purple-300 font-bold uppercase">${role}</div>
                    </div>
                </button>
                <div class="absolute right-0 mt-2 w-48 bg-[#0f0f1a] border border-purple-500/30 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 overflow-hidden">
                    <button id="btn-profile" class="block w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-purple-500/20 hover:text-white">👤 Hồ sơ</button>
                    ${['admin'].includes(role) ? `<button id="btn-admin" class="block w-full text-left px-4 py-3 text-sm hover:bg-yellow-500/20 font-bold">👤 Quản Lý User</button>` : ''}
                    ${['admin', 'dev'].includes(role) ? `<a href="admin.html" class="block w-full text-left px-4 py-3 text-sm text-yellow-400 hover:bg-yellow-500/20 font-bold no-underline">🛡️ Admin Panel</a>` : ''}
                    <button id="btn-logout" class="block w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/20 border-t border-gray-700">⏏ Đăng xuất</button>
                </div>
            </div>`;

        // Gán sự kiện click
        document.getElementById('btn-logout').onclick = () => { showCustomModal("ĐĂNG XUẤT", "Bạn có chắc chắn muốn đăng xuất?", "confirm", () => logout()); };
        document.getElementById('btn-profile').onclick = () => {
            document.getElementById('edit-name').value = user.displayName;
            document.getElementById('edit-avatar').value = user.photoURL || '';
            document.getElementById('profile-preview').src = avatar;
            document.getElementById('profile-modal').classList.add('active');
        };
        if (document.getElementById('btn-admin')) {
            document.getElementById('btn-admin').onclick = () => {
                document.getElementById('admin-modal').classList.add('active');
                renderAdminTable();
            };
        }

        // 2. SỬA LỖI MEMBER KHÔNG THẤY NÚT ĐĂNG BÀI
        // Thêm 'member' vào danh sách cho phép
        if (['admin', 'dev', 'helper', 'member'].includes(role)) {
            const btn = document.getElementById('create-post-trigger');
            if (btn) btn.classList.remove('hidden');
        }

        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();

        // 2. Nếu đang đứng ở trang Diễn đàn, VẼ LẠI CÁI MỚI NGAY
        if (document.getElementById('section-forum').classList.contains('active')) {
            renderForum('approved');
        }

    } else {
        // ... (Giữ nguyên phần chưa đăng nhập)
        authDisplay.innerHTML = `<button id="login-trigger" class="cyber-btn px-6 py-2.5 rounded-lg font-bold text-sm title-font">LOGIN ⚡</button>`;
        document.getElementById('login-trigger').onclick = () => document.getElementById('auth-modal').classList.add('active');
        const btn = document.getElementById('create-post-trigger');
        if (btn) btn.classList.add('hidden');

        // Nếu logout, cũng cần reset lại forum để mất nút Duyệt
        const oldTabs = document.getElementById('forum-tabs');
        if (oldTabs) oldTabs.remove();
        if (document.getElementById('section-forum').classList.contains('active')) renderForum('approved');
    }
}

// Particle Effect 
const initParticles = () => {
    const canvas = document.getElementById('particle-network');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particlesArray = [];

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1;
            this.speedX = Math.random() * 0.5 - 0.25;
            this.speedY = Math.random() * 0.5 - 0.25;
            this.color = Math.random() > 0.5 ? '#8b5cf6' : '#22d3ee';
        }
        update() {
            this.x += this.speedX; this.y += this.speedY;
            if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
            if (this.y > canvas.height || this.y < 0) this.speedY *= -1;
        }
        draw() {
            ctx.fillStyle = this.color; ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
    }

    for (let i = 0; i < Math.floor((canvas.width * canvas.height) / 20000); i++) particlesArray.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update(); particlesArray[i].draw();
            for (let j = i; j < particlesArray.length; j++) {
                const dx = particlesArray[i].x - particlesArray[j].x;
                const dy = particlesArray[i].y - particlesArray[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    ctx.beginPath(); ctx.strokeStyle = `rgba(139, 92, 246, ${0.1 - dist / 1000})`;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
};

window.addEventListener('load', async () => {
    // 1. Setup UI
    initParticles();
    setTimeout(() => document.getElementById('preloader')?.classList.add('hidden'), 800);

    // 2. Setup Modals Close Logic
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
        m.querySelectorAll('.close-modal').forEach(b => b.onclick = () => m.classList.remove('active'));
    });

    window.showCustomModal = showCustomModal;

    setupAuthForms();

    const mobileBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const desktopLinks = document.getElementById('nav-links');

    if (mobileBtn && mobileMenu && desktopLinks) {
        // 1. Tạo link cho mobile từ menu desktop (để không phải viết lại HTML)
        const links = desktopLinks.querySelectorAll('a');
        let mobileHtml = '';

        links.forEach(link => {
            const target = link.getAttribute('data-nav');
            const text = link.innerText;
            // Tạo thẻ a mới với style phù hợp cho mobile
            mobileHtml += `<a href="#${target}" 
                class="nav-link block px-4 py-3 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg font-bold title-font transition mb-1" 
                data-nav="${target}">
                ${text}
            </a>`;
        });
        mobileMenu.innerHTML = mobileHtml;

        // 2. Bắt sự kiện click nút Menu
        mobileBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // 3. Tự động đóng menu khi click vào link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // 3. Setup Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Active Link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Section
            const target = link.getAttribute('data-nav');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${target}`).classList.add('active');

            // Render content khi chuyển tab
            if (target === 'news') renderNews();
            if (target === 'guide') renderGuides();
            if (target === 'forum') renderForum('approved');
            if (target === 'admin') renderAdminTable();
            if (target === 'ranking') renderRanking();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // 4. Setup Profile Save
    document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.innerHTML = "⏳...";
        try {
            await updateUserProfile(document.getElementById('edit-name').value, document.getElementById('edit-avatar').value);
            showCustomModal("THÀNH CÔNG", "Hồ sơ đã được cập nhật!", "info");
            document.getElementById('profile-modal').classList.remove('active');
        } catch (err) { showCustomModal("LỖI", err.message, "danger"); }
        finally { btn.innerHTML = "LƯU THAY ĐỔI 💾"; }
    });

    // 6. Setup Create Post
    document.getElementById('create-post-trigger')?.addEventListener('click', () => {
        document.getElementById('post-modal').classList.add('active');
    });

    document.getElementById('forum-post-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('forum-title').value;
        const content = document.getElementById('forum-content').value;
        try {
            const status = ['admin', 'dev'].includes(currentRole) ? 'approved' : 'pending';
            await createPost('forum_posts', { title, content, status, authorRole: currentRole });
            showCustomModal(status === 'approved' ? "ĐĂNG BÀI THÀNH CÔNG" : "ĐÃ GỬI DUYỆT", status === 'approved' ? "Bài viết đã được đăng!" : "Bài viết đang chờ admin duyệt.", "info");
            document.getElementById('post-modal').classList.remove('active');
            renderForum(status === 'approved' ? 'approved' : 'pending');
        } catch (e) { showCustomModal("LỖI ĐĂNG BÀI", e.message, "danger"); }
    });

    // 7. Setup Search Admin
    document.getElementById('user-search')?.addEventListener('keyup', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.user-row').forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(term) ? '' : 'none';
        });
    });

    // 8. Load Content & Auth
    renderNews();
    renderGuides();
    renderForum('approved');
    renderRanking();
    updateServerStatus();
    subscribeToAuth(handleAuthUI);
});

// Các sự kiện click nút trang chủ
document.getElementById('copy-ip-btn').onclick = window.copyServerIP;
document.getElementById('discord-btn').onclick = window.openDiscord;