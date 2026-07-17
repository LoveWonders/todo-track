package com.todotrack.app.plugins;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "DownloadPlugin")
public class DownloadPlugin extends Plugin {

    @PluginMethod
    public void saveToDownloads(PluginCall call) {
        String filename = call.getString("filename");
        String data = call.getString("data");

        if (filename == null || data == null) {
            call.reject("filename 和 data 参数不能为空");
            return;
        }

        try {
            Context context = getContext();
            ContentValues values = new ContentValues();
            values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
            values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
            values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

            Uri collection = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
            Uri uri = context.getContentResolver().insert(collection, values);

            if (uri == null) {
                call.reject("无法创建下载文件：MediaStore insert 返回 null");
                return;
            }

            OutputStream os = context.getContentResolver().openOutputStream(uri);
            if (os == null) {
                call.reject("无法打开输出流");
                return;
            }

            os.write(data.getBytes("UTF-8"));
            os.close();

            JSObject result = new JSObject();
            result.put("uri", uri.toString());
            result.put("filename", filename);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("写入失败：" + e.getMessage(), null, e);
        }
    }
}
