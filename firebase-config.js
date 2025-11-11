// firebase-config.js - النسخة المحسنة
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, off, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBdYDzB2qQ0U2LLY6SerGakcQWBXnwuaZU",
    authDomain: "accounts-system-1e921.firebaseapp.com",
    databaseURL: "https://accounts-system-1e921-default-rtdb.firebaseio.com",
    projectId: "accounts-system-1e921",
    storageBucket: "accounts-system-1e921.firebasestorage.app",
    messagingSenderId: "762892744961",
    appId: "1:762892744961:web:7b4c61e12c2446831cc300",
    measurementId: "G-RRBW02490J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Firebase Application Object
const firebaseApp = {
    isOnline: function() {
        return navigator.onLine;
    },

    // إعداد الاتصال ومراقبة الحالة
    setupConnectionMonitoring: function() {
        const connectedRef = ref(database, ".info/connected");
        onValue(connectedRef, (snapshot) => {
            const isConnected = snapshot.val();
            this.updateConnectionStatus(isConnected);
            
            if (isConnected) {
                console.log("✅ متصل بـ Firebase");
                this.syncLocalChanges();
            } else {
                console.log("❌ غير متصل بـ Firebase");
            }
        });
    },

    // تحديث حالة الاتصال في الواجهة
    updateConnectionStatus: function(isConnected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            if (isConnected) {
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> متصل';
                statusElement.style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';
            } else {
                statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> غير متصل';
                statusElement.style.background = 'linear-gradient(135deg, #e63946, #c1121f)';
            }
        }
    },

    // الاستماع في الوقت الحقيقي للتغييرات مع تحسينات
    setupRealtimeListeners: function() {
        console.log("🔄 إعداد المستمعين في الوقت الحقيقي...");
        
        // الاستماع للتغييرات في العملاء
        const clientsRef = ref(database, 'clients');
        onValue(clientsRef, (snapshot) => {
            const clientsData = snapshot.val();
            console.log("📥 تم استقبال تحديث العملاء:", clientsData);
            
            if (clientsData && typeof window.updateClientsFromFirebase === 'function') {
                window.updateClientsFromFirebase(clientsData);
            }
            
            // تحديث التخزين المحلي
            this.updateLocalStorage('savedClients', clientsData);
        }, (error) => {
            console.error("❌ خطأ في استماع العملاء:", error);
        });

        // الاستماع للتغييرات في الخدمات
        const servicesRef = ref(database, 'services');
        onValue(servicesRef, (snapshot) => {
            const servicesData = snapshot.val();
            console.log("📥 تم استقبال تحديث الخدمات:", servicesData);
            
            if (servicesData && typeof window.updateServicesFromFirebase === 'function') {
                window.updateServicesFromFirebase(servicesData);
            }
            
            this.updateLocalStorage('servicesData', servicesData);
        }, (error) => {
            console.error("❌ خطأ في استماع الخدمات:", error);
        });

        // الاستماع للتغييرات في الإعدادات
        const settingsRef = ref(database, 'settings');
        onValue(settingsRef, (snapshot) => {
            const settingsData = snapshot.val();
            console.log("📥 تم استقبال تحديث الإعدادات:", settingsData);
            
            if (settingsData && typeof window.updateSettingsFromFirebase === 'function') {
                window.updateSettingsFromFirebase(settingsData);
            }
            
            this.updateLocalStorage('settings', settingsData);
        }, (error) => {
            console.error("❌ خطأ في استماع الإعدادات:", error);
        });

        // الاستماع للتغييرات في المعاملات
        const transactionsRef = ref(database, 'transactions');
        onValue(transactionsRef, (snapshot) => {
            const transactionsData = snapshot.val();
            console.log("📥 تم استقبال تحديث المعاملات:", transactionsData);
            
            if (transactionsData && typeof window.updateTransactionsFromFirebase === 'function') {
                window.updateTransactionsFromFirebase(transactionsData);
            }
            
            this.updateLocalStorage('inventoryTransactions', transactionsData);
        }, (error) => {
            console.error("❌ خطأ في استماع المعاملات:", error);
        });
    },

    // تحديث التخزين المحلي مع البيانات من Firebase
    updateLocalStorage: function(key, firebaseData) {
        if (firebaseData) {
            localStorage.setItem(key, JSON.stringify(firebaseData));
            console.log(`✅ تم تحديث التخزين المحلي لـ ${key}`);
        }
    },

    // مزامنة التغييرات المحلية مع Firebase
    syncLocalChanges: async function() {
        console.log("🔄 بدء مزامنة التغييرات المحلية...");
        
        // مزامنة العملاء
        await this.syncLocalClients();
        
        // مزامنة الخدمات
        await this.syncLocalServices();
        
        // مزامنة المعاملات
        await this.syncLocalTransactions();
        
        console.log("✅ اكتملت مزامنة التغييرات المحلية");
    },

    // مزامنة العملاء المحليين
    syncLocalClients: async function() {
        try {
            const localClients = JSON.parse(localStorage.getItem('savedClients') || '[]');
            const firebaseClients = await this.getAllClients();
            
            if (firebaseClients.success) {
                for (const localClient of localClients) {
                    // إذا كان العميل غير موجود في Firebase أو يحتاج تحديث
                    if (!firebaseClients.data[localClient.id] || 
                        (localClient.lastUpdated && localClient.lastUpdated > firebaseClients.data[localClient.id].lastUpdated)) {
                        await this.updateClient(localClient.id, localClient);
                    }
                }
            }
        } catch (error) {
            console.error("❌ خطأ في مزامنة العملاء:", error);
        }
    },

    // مزامنة الخدمات المحلية
    syncLocalServices: async function() {
        try {
            const localServices = JSON.parse(localStorage.getItem('servicesData') || '[]');
            const firebaseServices = await this.getAllServices();
            
            if (firebaseServices.success) {
                for (const localService of localServices) {
                    if (!firebaseServices.data[localService.id]) {
                        await this.addService(localService);
                    }
                }
            }
        } catch (error) {
            console.error("❌ خطأ في مزامنة الخدمات:", error);
        }
    },

    // مزامنة المعاملات المحلية
    syncLocalTransactions: async function() {
        try {
            const localTransactions = JSON.parse(localStorage.getItem('inventoryTransactions') || '[]');
            const firebaseTransactions = await this.getAllTransactions();
            
            if (firebaseTransactions.success) {
                for (const localTransaction of localTransactions) {
                    if (!firebaseTransactions.data[localTransaction.id]) {
                        await this.addTransaction(localTransaction);
                    }
                }
            }
        } catch (error) {
            console.error("❌ خطأ في مزامنة المعاملات:", error);
        }
    },

    // إضافة عميل جديد
    addClient: async function(clientData) {
        try {
            const clientRef = ref(database, 'clients/' + clientData.id);
            await set(clientRef, {
                ...clientData,
                firebaseTimestamp: serverTimestamp(),
                lastUpdated: Date.now()
            });
            console.log("✅ تم إضافة العميل إلى Firebase:", clientData.id);
            return { success: true, id: clientData.id };
        } catch (error) {
            console.error('❌ خطأ في إضافة العميل:', error);
            return { success: false, error: error.message };
        }
    },

    // تحديث بيانات العميل
    updateClient: async function(clientId, clientData) {
        try {
            const clientRef = ref(database, 'clients/' + clientId);
            await update(clientRef, {
                ...clientData,
                lastUpdated: Date.now()
            });
            console.log("✅ تم تحديث العميل في Firebase:", clientId);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في تحديث العميل:', error);
            return { success: false, error: error.message };
        }
    },

    // جلب بيانات العميل
    getClient: async function(clientId) {
        try {
            const clientRef = ref(database, 'clients/' + clientId);
            const snapshot = await get(clientRef);
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            } else {
                return { success: false, error: 'Client not found' };
            }
        } catch (error) {
            console.error('❌ خطأ في جلب العميل:', error);
            return { success: false, error: error.message };
        }
    },

    // جلب جميع العملاء
    getAllClients: async function() {
        try {
            const clientsRef = ref(database, 'clients');
            const snapshot = await get(clientsRef);
            if (snapshot.exists()) {
                const clients = snapshot.val();
                console.log("📋 العملاء المحملون من Firebase:", Object.keys(clients).length);
                return { success: true, data: clients };
            } else {
                console.log("📋 لا توجد عملاء في Firebase");
                return { success: true, data: {} };
            }
        } catch (error) {
            console.error('❌ خطأ في جلب العملاء:', error);
            return { success: false, error: error.message };
        }
    },

    // حذف عميل
    deleteClient: async function(clientId) {
        try {
            const clientRef = ref(database, 'clients/' + clientId);
            await remove(clientRef);
            console.log("✅ تم حذف العميل من Firebase:", clientId);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في حذف العميل:', error);
            return { success: false, error: error.message };
        }
    },

    // إضافة خدمة جديدة
    addService: async function(serviceData) {
        try {
            const serviceRef = ref(database, 'services/' + serviceData.id);
            await set(serviceRef, {
                ...serviceData,
                firebaseTimestamp: serverTimestamp(),
                lastUpdated: Date.now()
            });
            console.log("✅ تم إضافة الخدمة إلى Firebase:", serviceData.name);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في إضافة الخدمة:', error);
            return { success: false, error: error.message };
        }
    },

    // تحديث خدمة
    updateService: async function(serviceId, serviceData) {
        try {
            const serviceRef = ref(database, 'services/' + serviceId);
            await update(serviceRef, serviceData);
            console.log("✅ تم تحديث الخدمة في Firebase:", serviceId);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في تحديث الخدمة:', error);
            return { success: false, error: error.message };
        }
    },

    // حذف خدمة
    deleteService: async function(serviceId) {
        try {
            const serviceRef = ref(database, 'services/' + serviceId);
            await remove(serviceRef);
            console.log("✅ تم حذف الخدمة من Firebase:", serviceId);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في حذف الخدمة:', error);
            return { success: false, error: error.message };
        }
    },

    // جلب جميع الخدمات
    getAllServices: async function() {
        try {
            const servicesRef = ref(database, 'services');
            const snapshot = await get(servicesRef);
            if (snapshot.exists()) {
                const services = snapshot.val();
                console.log("📋 الخدمات المحملة من Firebase:", Object.keys(services).length);
                return { success: true, data: services };
            } else {
                console.log("📋 لا توجد خدمات في Firebase");
                return { success: true, data: {} };
            }
        } catch (error) {
            console.error('❌ خطأ في جلب الخدمات:', error);
            return { success: false, error: error.message };
        }
    },

    // تحديث العداد
    updateCounter: async function(counterValue) {
        try {
            const counterRef = ref(database, 'settings/clientCounter');
            await set(counterRef, counterValue);
            console.log("✅ تم تحديث العداد في Firebase:", counterValue);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في تحديث العداد:', error);
            return { success: false, error: error.message };
        }
    },

    // تحديث رأس المال
    updateCapital: async function(capitalValue) {
        try {
            const capitalRef = ref(database, 'settings/initialCapital');
            await set(capitalRef, capitalValue);
            console.log("✅ تم تحديث رأس المال في Firebase:", capitalValue);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في تحديث رأس المال:', error);
            return { success: false, error: error.message };
        }
    },

    // جلب الإعدادات
    getSettings: async function() {
        try {
            const settingsRef = ref(database, 'settings');
            const snapshot = await get(settingsRef);
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            } else {
                return { success: true, data: {} };
            }
        } catch (error) {
            console.error('❌ خطأ في جلب الإعدادات:', error);
            return { success: false, error: error.message };
        }
    },

    // إضافة معاملة مالية
    addTransaction: async function(transactionData) {
        try {
            const transactionRef = ref(database, 'transactions/' + transactionData.id);
            await set(transactionRef, {
                ...transactionData,
                firebaseTimestamp: serverTimestamp(),
                lastUpdated: Date.now()
            });
            console.log("✅ تم إضافة المعاملة إلى Firebase:", transactionData.id);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في إضافة المعاملة:', error);
            return { success: false, error: error.message };
        }
    },

    // جلب جميع المعاملات
    getAllTransactions: async function() {
        try {
            const transactionsRef = ref(database, 'transactions');
            const snapshot = await get(transactionsRef);
            if (snapshot.exists()) {
                const transactions = snapshot.val();
                console.log("📋 المعاملات المحملة من Firebase:", Object.keys(transactions).length);
                return { success: true, data: transactions };
            } else {
                console.log("📋 لا توجد معاملات في Firebase");
                return { success: true, data: {} };
            }
        } catch (error) {
            console.error('❌ خطأ في جلب المعاملات:', error);
            return { success: false, error: error.message };
        }
    },

    // حذف معاملة
    deleteTransaction: async function(transactionId) {
        try {
            const transactionRef = ref(database, 'transactions/' + transactionId);
            await remove(transactionRef);
            console.log("✅ تم حذف المعاملة من Firebase:", transactionId);
            return { success: true };
        } catch (error) {
            console.error('❌ خطأ في حذف المعاملة:', error);
            return { success: false, error: error.message };
        }
    }
};

// جعل firebaseApp متاحاً globally
window.firebaseApp = firebaseApp;

console.log("✅ Firebase configured successfully");

// إعداد الاتصال والمستمعين بعد تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        firebaseApp.setupConnectionMonitoring();
        firebaseApp.setupRealtimeListeners();
    }, 2000);
});