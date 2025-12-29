package com.iptv.setupbox

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        try {
            if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
                Log.i("BootReceiver", "BOOT_COMPLETED received — launching MainActivity")
                val i = Intent(context, MainActivity::class.java)
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                context.startActivity(i)
            }
        } catch (e: Exception) {
            Log.w("BootReceiver", "Failed to handle BOOT_COMPLETED: ${e.message}")
        }
    }
}
