package studio.novaforge.integration

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Explicit, user-controlled handoff from NovaForge Image Studios to
 * KVADGroup Photo Studio PRO.
 *
 * The source image is not modified in place by NovaForge. Pass a content://
 * Uri backed by FileProvider or another readable content provider.
 */
object PhotoStudioProHandoff {
    const val PACKAGE_NAME = "com.kvadgroup.photostudio_pro"

    enum class Result {
        OPENED_EDITOR,
        OPENED_TARGETED_SHARE,
        OPENED_GENERIC_SHARE,
        NO_HANDLER
    }

    fun editImage(context: Context, imageUri: Uri): Result {
        val flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or
            if (context !is android.app.Activity) Intent.FLAG_ACTIVITY_NEW_TASK else 0

        val editIntent = Intent(Intent.ACTION_EDIT).apply {
            setDataAndType(imageUri, "image/*")
            setPackage(PACKAGE_NAME)
            addFlags(flags)
        }

        try {
            context.startActivity(editIntent)
            return Result.OPENED_EDITOR
        } catch (_: ActivityNotFoundException) {
            // Fall through to a targeted share. Some editors expose SEND rather than EDIT.
        }

        val targetedShare = Intent(Intent.ACTION_SEND).apply {
            type = "image/*"
            putExtra(Intent.EXTRA_STREAM, imageUri)
            setPackage(PACKAGE_NAME)
            addFlags(flags)
        }

        try {
            context.startActivity(targetedShare)
            return Result.OPENED_TARGETED_SHARE
        } catch (_: ActivityNotFoundException) {
            // Fall through to the standard Android chooser.
        }

        val genericShare = Intent(Intent.ACTION_SEND).apply {
            type = "image/*"
            putExtra(Intent.EXTRA_STREAM, imageUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        return try {
            val chooser = Intent.createChooser(genericShare, "Edit with Photo Studio PRO").apply {
                if (context !is android.app.Activity) addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(chooser)
            Result.OPENED_GENERIC_SHARE
        } catch (_: ActivityNotFoundException) {
            Result.NO_HANDLER
        }
    }

    fun openApp(context: Context): Boolean {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(PACKAGE_NAME)
            ?: return false

        if (context !is android.app.Activity) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        return try {
            context.startActivity(launchIntent)
            true
        } catch (_: ActivityNotFoundException) {
            false
        }
    }
}
